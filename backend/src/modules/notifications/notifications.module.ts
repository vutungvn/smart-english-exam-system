import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AttemptNotificationsService } from './attempt-notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { NotificationsService } from './notifications.service.js';

// Thông báo (SPRINT-56): bảng notifications + Socket.IO namespace /notifications (xác thực bằng
// access token). AssessmentsModule, AttemptsModule gọi AttemptNotificationsService khi chấm xong,
// tự nộp bài, chấm lỗi
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService, AttemptNotificationsService],
  exports: [NotificationsService, AttemptNotificationsService],
})
export class NotificationsModule {}
