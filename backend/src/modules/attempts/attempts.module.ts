import { Module } from '@nestjs/common';
import { AttemptAutoSubmitService } from './attempt-auto-submit.service.js';
import { AttemptSubmissionService } from './attempt-submission.service.js';
import { AttemptsController } from './attempts.controller.js';
import { AttemptsService } from './attempts.service.js';
import { ExamCatalogController } from './exam-catalog.controller.js';
import { ExamCatalogService } from './exam-catalog.service.js';

// Học viên: xem đề đã xuất bản, làm bài (bắt đầu, tự động lưu, khôi phục, hủy), nộp bài và chấm
// phần trắc nghiệm; tự nộp bài hết giờ bằng tác vụ định kỳ
@Module({
  controllers: [ExamCatalogController, AttemptsController],
  providers: [
    ExamCatalogService,
    AttemptsService,
    AttemptSubmissionService,
    AttemptAutoSubmitService,
  ],
})
export class AttemptsModule {}
