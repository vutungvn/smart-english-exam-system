import { Module } from '@nestjs/common';
import { AssessmentsModule } from '../assessments/assessments.module.js';
import { PaperCacheModule } from '../exams/paper-cache.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AttemptAutoSubmitService } from './attempt-auto-submit.service.js';
import { AttemptReviewService } from './attempt-review.service.js';
import { AttemptSubmissionService } from './attempt-submission.service.js';
import { AttemptsController } from './attempts.controller.js';
import { AttemptsService } from './attempts.service.js';
import { ExamCatalogController } from './exam-catalog.controller.js';
import { ExamCatalogService } from './exam-catalog.service.js';
import { RecordingCleanupService } from './recording-cleanup.service.js';
import { RecordingService } from './recording.service.js';

// Học viên: xem đề đã xuất bản, làm bài (bắt đầu, tự động lưu, khôi phục, hủy), nộp bài và chấm
// phần trắc nghiệm; ghi âm Speaking (tải lên, chuẩn hóa ffmpeg, tự xóa sau 30 ngày); tự nộp bài hết giờ bằng tác vụ định
// kỳ (kèm thông báo); xem lại bài đã nộp, lịch sử làm bài. Câu Speaking/Writing đưa vào hàng đợi AI
// chấm (AssessmentsModule)
@Module({
  imports: [PaperCacheModule, AssessmentsModule, NotificationsModule],
  controllers: [ExamCatalogController, AttemptsController],
  providers: [
    ExamCatalogService,
    AttemptsService,
    AttemptSubmissionService,
    AttemptAutoSubmitService,
    AttemptReviewService,
    RecordingService,
    RecordingCleanupService,
  ],
})
export class AttemptsModule {}
