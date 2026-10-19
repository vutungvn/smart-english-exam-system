import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

// Học viên: tiến độ học tập (điểm theo thời gian, năng lực theo kỹ năng, Part, chủ đề yếu)
@Module({
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
