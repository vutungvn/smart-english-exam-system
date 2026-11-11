import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { Env } from '../../config/env.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AttemptStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';

const BATCH = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Xóa bài nói Speaking quá hạn lưu (D19, job media-cleanup của SPRINT-88): giọng nói là dữ liệu cá
 * nhân nên chỉ giữ RECORDING_RETENTION_DAYS ngày (mặc định 30) sau khi nộp bài; bài đã hủy tính từ
 * lúc bắt đầu làm. Chạy mỗi ngày lúc 3 giờ sáng (giờ Việt Nam), xóa tệp trong kho rồi đặt
 * audio_key = NULL, ghi audio_deleted_at để câu vẫn tính là đã trả lời. Điểm, transcript, nhận xét
 * giữ nguyên; bài đang làm không đụng tới
 */
@Injectable()
export class RecordingCleanupService {
  private readonly logger = new Logger(RecordingCleanupService.name);
  private readonly retentionDays: number;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    config: ConfigService<Env, true>,
  ) {
    this.retentionDays = config.get('RECORDING_RETENTION_DAYS', { infer: true });
  }

  @Cron('0 3 * * *', { name: 'recording-cleanup', timeZone: 'Asia/Ho_Chi_Minh' })
  async runDaily(): Promise<void> {
    await this.cleanup();
  }

  /** Trả số bài nói đã xóa. Chạy lại bao nhiêu lần cũng được (key đã xóa thì bỏ qua) */
  async cleanup(now = new Date()): Promise<number> {
    // Lượt trước chưa xong (nhiều tệp, kho tệp chậm) thì bỏ qua lượt này
    if (this.running) return 0;
    this.running = true;
    try {
      const cutoff = new Date(now.getTime() - this.retentionDays * DAY_MS);
      const where: Prisma.AttemptAnswerWhereInput = {
        audioKey: { not: null },
        attempt: {
          OR: [
            {
              status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
              submittedAt: { lt: cutoff },
            },
            { status: AttemptStatus.CANCELLED, startedAt: { lt: cutoff } },
          ],
        },
      };

      let deleted = 0;
      // Tệp xóa lỗi (kho tệp tạm hỏng) bỏ qua trong lượt này, ngày mai thử lại
      const skipped: string[] = [];
      for (;;) {
        const rows = await this.prisma.attemptAnswer.findMany({
          where: { ...where, id: { notIn: skipped } },
          select: { id: true, audioKey: true },
          orderBy: { id: 'asc' },
          take: BATCH,
        });
        if (rows.length === 0) break;

        for (const { id, audioKey } of rows) {
          try {
            await this.storage.delete(audioKey as string);
          } catch (error) {
            skipped.push(id);
            this.logger.warn(`Không xóa được bài nói ${audioKey}: ${(error as Error).message}`);
            continue;
          }
          // Điều kiện audioKey cũ: học viên không thể ghi âm lại bài đã nộp, nhưng vẫn chặn ghi đè nhầm
          const { count } = await this.prisma.attemptAnswer.updateMany({
            where: { id, audioKey },
            data: { audioKey: null, audioDeletedAt: now },
          });
          deleted += count;
        }
      }

      if (deleted > 0 || skipped.length > 0) {
        this.logger.log(
          `Đã xóa ${deleted} bài nói quá ${this.retentionDays} ngày` +
            (skipped.length ? `, ${skipped.length} bài lỗi để lần sau` : ''),
        );
      }
      return deleted;
    } finally {
      this.running = false;
    }
  }
}
