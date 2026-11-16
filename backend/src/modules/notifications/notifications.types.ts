import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../generated/prisma/enums.js';

/** Sự kiện Socket.IO namespace /notifications gửi tới trình duyệt, payload là NotificationItem */
export const NOTIFICATION_EVENT = 'notification';

/** Dữ liệu kèm thông báo để giao diện dẫn tới trang liên quan */
export class NotificationData {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Bài làm liên quan (trang kết quả, xem lại)',
  })
  attemptId?: string;
}

export class NotificationItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: NotificationType,
    enumName: 'NotificationType',
    description:
      'ATTEMPT_GRADED: AI chấm xong, bài đã có điểm · ATTEMPT_AUTO_SUBMITTED: hết giờ, hệ thống tự nộp · ' +
      'GRADING_FAILED: có câu Speaking/Writing chấm lỗi, cần bấm "Chấm lại"',
  })
  type: NotificationType;

  @ApiProperty({ example: 'Đã chấm xong bài làm' })
  title: string;

  @ApiProperty({ example: 'TOEIC Speaking Test 1: 150 điểm' })
  message: string;

  @ApiProperty({ type: NotificationData, nullable: true })
  data: NotificationData | null;

  @ApiProperty({ type: Date, nullable: true, description: 'null: chưa đọc' })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class UnreadNotificationCount {
  @ApiProperty({ type: 'integer', example: 2 })
  count: number;
}
