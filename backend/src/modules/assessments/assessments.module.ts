import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller.js';
import { AssessmentsService } from './assessments.service.js';
import { AttemptScoringService } from './attempt-scoring.service.js';
import { GradingQueueService } from './grading-queue.service.js';
import { AnswerGraderService } from './answer-grader.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { TeacherAssessmentsController } from './teacher-assessments.controller.js';
import { TeacherAssessmentsService } from './teacher-assessments.service.js';

// Chấm Speaking/Writing bằng AI (SPRINT-86): hàng đợi BullMQ sw-grading, chấm từng câu qua AiGateway,
// tổng hợp điểm bài làm (ToeicSwStrategy), tiến độ chấm và chấm lại câu lỗi. AttemptsModule dùng
// AttemptScoringService + GradingQueueService lúc nộp bài. Chấm xong hoặc chấm lỗi thì báo cho học viên.
// Giáo viên xem lại, sửa điểm AI; học viên yêu cầu giáo viên chấm lại (SPRINT-91)
@Module({
  imports: [NotificationsModule],
  controllers: [AssessmentsController, TeacherAssessmentsController],
  providers: [
    AssessmentsService,
    AttemptScoringService,
    GradingQueueService,
    AnswerGraderService,
    TeacherAssessmentsService,
  ],
  exports: [AssessmentsService, AttemptScoringService, GradingQueueService],
})
export class AssessmentsModule {}
