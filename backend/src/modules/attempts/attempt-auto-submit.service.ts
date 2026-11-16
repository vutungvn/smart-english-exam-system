import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AttemptStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AttemptNotificationsService } from '../notifications/attempt-notifications.service.js';
import { SYNC_GRACE_SECONDS } from './attempt-rules.js';
import { AttemptSubmissionService } from './attempt-submission.service.js';

const EVERY_SECONDS = 30;
const BATCH = 100;

/**
 * Tự nộp bài hết giờ: cứ 30 giây quét các lượt đang làm đã quá expires_at + thời gian ân hạn đồng
 * bộ offline (2 phút, khớp PATCH /answers) rồi nộp và chấm. Dùng chỉ mục ix_attempts_expiring.
 * Thay job trễ của BullMQ (quyết định SPRINT-52); khi học viên mở lại bài quá hạn, AttemptsService
 * cũng nộp luôn nên không phải chờ tới lượt quét. Nộp xong thì báo cho học viên (SPRINT-56): điểm,
 * hoặc "AI đang chấm" nếu đề có Speaking/Writing.
 */
@Injectable()
export class AttemptAutoSubmitService {
  private readonly logger = new Logger(AttemptAutoSubmitService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly submission: AttemptSubmissionService,
    private readonly notifications: AttemptNotificationsService,
  ) {}

  @Interval('attempt-auto-submit', EVERY_SECONDS * 1000)
  async submitExpired(): Promise<number> {
    // Lượt quét trước chưa xong (nhiều bài, DB chậm) thì bỏ qua lượt này
    if (this.running) return 0;
    this.running = true;
    try {
      const due = await this.prisma.examAttempt.findMany({
        where: {
          status: AttemptStatus.IN_PROGRESS,
          expiresAt: { lt: new Date(Date.now() - SYNC_GRACE_SECONDS * 1000) },
        },
        orderBy: { expiresAt: 'asc' },
        select: { id: true },
        take: BATCH,
      });

      let submitted = 0;
      for (const { id } of due) {
        try {
          if (await this.submission.autoSubmit(id)) {
            submitted++;
            await this.notifications.autoSubmitted(id);
          }
        } catch (error) {
          // Lỗi một bài không chặn các bài khác; lượt quét sau thử lại
          this.logger.error(
            `Không tự nộp được bài ${id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      if (submitted > 0) this.logger.log(`Đã tự nộp ${submitted} bài hết giờ`);
      return submitted;
    } finally {
      this.running = false;
    }
  }
}
