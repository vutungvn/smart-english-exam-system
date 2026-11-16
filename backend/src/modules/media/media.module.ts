import { Global, Module } from '@nestjs/common';
import { MediaController } from './media.controller.js';
import { MediaUrlService } from './media-url.service.js';

// Phát tệp từ kho ra trình duyệt. Global để module câu hỏi, đề thi (sau này bài làm)
// dùng MediaUrlService gắn URL audio/ảnh vào response
@Global()
@Module({
  controllers: [MediaController],
  providers: [MediaUrlService],
  exports: [MediaUrlService],
})
export class MediaModule {}
