import { Global, Module } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service.js';

// Global: chấm điểm, AI, dọn bản ghi âm đều đọc cấu hình
@Global()
@Module({
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
