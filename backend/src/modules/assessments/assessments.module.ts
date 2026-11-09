import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller.js';
import { AssessmentsService } from './assessments.service.js';
import { AttemptScoringService } from './attempt-scoring.service.js';
import { GradingQueueService } from './grading-queue.service.js';
import { WritingGraderService } from './writing-grader.service.js';

// Chấm Speaking/Writing bằng AI (SPRINT-86): hàng đợi BullMQ sw-grading, chấm từng câu qua AiGateway,
// tổng hợp điểm bài làm (ToeicSwStrategy), tiến độ chấm và chấm lại câu lỗi. AttemptsModule dùng
// AttemptScoringService + GradingQueueService lúc nộp bài
@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AttemptScoringService, GradingQueueService, WritingGraderService],
  exports: [AssessmentsService, AttemptScoringService, GradingQueueService],
})
export class AssessmentsModule {}
