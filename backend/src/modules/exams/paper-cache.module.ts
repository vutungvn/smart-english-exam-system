import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PaperCacheInterceptor } from './paper-cache.interceptor.js';
import { PaperCacheService } from './paper-cache.service.js';

// Cache đề cho học viên làm bài; interceptor toàn cục xóa cache khi giáo viên, quản trị ghi dữ liệu
@Module({
  providers: [PaperCacheService, { provide: APP_INTERCEPTOR, useClass: PaperCacheInterceptor }],
  exports: [PaperCacheService],
})
export class PaperCacheModule {}
