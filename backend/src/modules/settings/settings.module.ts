import { Module } from '@nestjs/common';
import { AdminSettingsController } from './admin-settings.controller.js';
import { PublicSettingsController } from './public-settings.controller.js';
import { SettingsService } from './settings.service.js';

// Admin xem, sửa, khôi phục cấu hình; cấu hình công khai. Nghiệp vụ khác đọc qua SystemSettingsService
@Module({
  controllers: [AdminSettingsController, PublicSettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
