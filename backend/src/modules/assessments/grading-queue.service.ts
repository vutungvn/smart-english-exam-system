import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { Queue, Worker, type ConnectionOptions, type JobsOptions, type RedisOptions } from 'bullmq';
import type { Env } from '../../config/env.schema.js';
import { AssessmentStatus, Grader } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { WritingGraderService, type GradingJobData } from './writing-grader.service.js';

export const GRADING_QUEUE = 'sw-grading';

/** Mỗi câu thử chấm tối đa 3 lần (cách nhau 5s, 10s) rồi mới FAILED */
const JOB_ATTEMPTS = 3;
const BACKOFF_MS = 5000;
/** Gemini Flash-Lite gói Free: 15 lượt/phút; chừa lại cho giải thích đáp án */
const GEMINI_PER_MINUTE = 12;
/** Phiếu PENDING không đổi quá lâu (server tắt giữa lúc nộp bài và lúc đưa vào hàng đợi): đưa lại */
const STUCK_AFTER_MS = 2 * 60_000;
/** BullMQ: số nhỏ hơn được chấm trước; "Chấm lại" của học viên ưu tiên hơn bài mới nộp */
const PRIORITY = { normal: 10, regrade: 1 } as const;

/**
 * Hàng đợi chấm Speaking/Writing bằng BullMQ (Redis), mỗi câu một job (Ke_hoach Mục 7.3, 7.4). Job
 * nằm trong Redis nên server khởi động lại vẫn chấm tiếp; jobId = id phiếu chấm nên đưa vào nhiều
 * lần (nộp bài, quét phiếu kẹt) vẫn chỉ có một job đang chờ
 */
@Injectable()
export class GradingQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(GradingQueueService.name);
  private readonly connection: ConnectionOptions;
  /** Chạy test: thử lại ngay (không chờ 5s, 10s) để test e2e nhánh chấm lỗi không quá lâu */
  private readonly backoffMs: number;
  private queue?: Queue<GradingJobData>;
  private worker?: Worker<GradingJobData>;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly grader: WritingGraderService,
  ) {
    // BullMQ cần maxRetriesPerRequest = null để worker chờ job (lệnh chặn) không bị ngắt
    const url: string = config.get('REDIS_URL', { infer: true });
    this.connection = { url, maxRetriesPerRequest: null } satisfies RedisOptions;
    this.backoffMs = config.get('NODE_ENV', { infer: true }) === 'test' ? 100 : BACKOFF_MS;
  }

  onApplicationBootstrap(): void {
    this.queue = new Queue<GradingJobData>(GRADING_QUEUE, { connection: this.connection });
    this.worker = new Worker<GradingJobData>(
      GRADING_QUEUE,
      (job, token) => this.grader.process(job, token),
      {
        connection: this.connection,
        concurrency: 2,
        // Dữ liệu mẫu (FakeAiProvider) không cần giới hạn tốc độ
        ...(this.grader.usesRealAi
          ? { limiter: { max: GEMINI_PER_MINUTE, duration: 60_000 } }
          : {}),
      },
    );
    this.queue.on('error', (error) => this.logger.error(`Lỗi hàng đợi: ${error.message}`));
    this.worker.on('error', (error) => this.logger.error(`Lỗi worker chấm bài: ${error.message}`));
    void this.requeueStuck();
  }

  async onModuleDestroy(): Promise<void> {
    // Chờ job đang chấm dở xong rồi mới đóng (job chưa chạy vẫn nằm trong Redis)
    await this.worker?.close();
    await this.queue?.close();
  }

  /** Đưa phiếu chấm vào hàng đợi. Lỗi Redis chỉ ghi log: lần quét phiếu kẹt sau sẽ đưa lại */
  async enqueue(assessmentIds: string[], kind: keyof typeof PRIORITY = 'normal'): Promise<void> {
    if (!this.queue || assessmentIds.length === 0) return;
    const opts: JobsOptions = {
      attempts: JOB_ATTEMPTS,
      backoff: { type: 'exponential', delay: this.backoffMs },
      priority: PRIORITY[kind],
      removeOnComplete: true,
      removeOnFail: true,
    };
    try {
      await this.queue.addBulk(
        assessmentIds.map((assessmentId) => ({
          name: 'grade',
          data: { assessmentId },
          opts: { ...opts, jobId: assessmentId },
        })),
      );
    } catch (error) {
      this.logger.error(
        `Không đưa được ${assessmentIds.length} phiếu vào hàng đợi: ${(error as Error).message}`,
      );
    }
  }

  /** Mỗi phút: phiếu PENDING kẹt (không có job) thì đưa lại; phiếu đang có job thì BullMQ bỏ qua */
  @Interval(60_000)
  async requeueStuck(): Promise<void> {
    try {
      const now = new Date();
      const stuck = await this.prisma.answerAssessment.findMany({
        where: {
          grader: Grader.AI,
          status: AssessmentStatus.PENDING,
          updatedAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) },
          OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
        },
        orderBy: { updatedAt: 'asc' },
        take: 100,
        select: { id: true },
      });
      await this.enqueue(stuck.map((row) => row.id));
    } catch (error) {
      this.logger.error(`Không quét được phiếu chấm kẹt: ${(error as Error).message}`);
    }
  }
}
