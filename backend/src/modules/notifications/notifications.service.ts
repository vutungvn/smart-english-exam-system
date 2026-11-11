import { Injectable, Logger } from '@nestjs/common';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { NotificationType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import type { NotificationData, NotificationItem } from './notifications.types.js';

export interface NewNotification {
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
}

const itemSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  data: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

type ItemRow = Prisma.NotificationGetPayload<{ select: typeof itemSelect }>;

function toItem(row: ItemRow): NotificationItem {
  return { ...row, data: (row.data ?? null) as NotificationData | null };
}

/** Thông báo của người dùng (SPRINT-56): lưu DB rồi phát qua WebSocket; xem, đánh dấu đã đọc */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Lưu và phát một thông báo. Không bao giờ ném lỗi: thông báo hỏng không được làm hỏng việc chính
   * (chấm bài, tự nộp bài) đã xong trước đó
   */
  async notify(userId: string, input: NewNotification): Promise<void> {
    try {
      const row = await this.prisma.notification.create({
        data: { userId, ...input, data: input.data ? { ...input.data } : undefined },
        select: itemSelect,
      });
      this.gateway.send(userId, toItem(row));
    } catch (error) {
      this.logger.error(`Không gửi được thông báo ${input.type}: ${(error as Error).message}`);
    }
  }

  /** Đã có thông báo chưa đọc cùng loại cho bài làm này (tránh báo lặp khi nhiều câu cùng lỗi) */
  async hasUnread(userId: string, type: NotificationType, attemptId: string): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: { userId, type, readAt: null, data: { path: ['attemptId'], equals: attemptId } },
    });
    return count > 0;
  }

  async list(userId: string, query: PaginationQueryDto): Promise<WithMeta<NotificationItem[]>> {
    const where = { userId };
    // Theo chỉ mục ix_notifications_user_created (user_id, created_at DESC)
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: itemSelect,
        ...toPrismaPage(query),
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(rows.map(toItem), total, query);
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  /** Chỉ thông báo của chính mình; đã đọc rồi thì giữ nguyên thời điểm đọc cũ */
  async markRead(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (count > 0) return;
    const exists = await this.prisma.notification.count({ where: { id, userId } });
    if (!exists) throw new AppException(ErrorCode.NOTIFICATION_NOT_FOUND);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
