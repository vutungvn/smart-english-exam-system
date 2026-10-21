import { Module } from '@nestjs/common';
import { AiExplanationsController } from './ai-explanations.controller.js';
import { AiExplanationsService } from './ai-explanations.service.js';

// Học viên: giải thích đáp án bằng AI ở màn xem lại, lượt dùng AI hôm nay
@Module({
  controllers: [AiExplanationsController],
  providers: [AiExplanationsService],
})
export class AiExplanationsModule {}
