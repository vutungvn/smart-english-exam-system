import { Module } from '@nestjs/common';
import { MediaController } from './media.controller.js';

// Phát tệp từ kho ra trình duyệt; sau này thêm audio, ảnh câu hỏi có kiểm tra quyền
@Module({
  controllers: [MediaController],
})
export class MediaModule {}
