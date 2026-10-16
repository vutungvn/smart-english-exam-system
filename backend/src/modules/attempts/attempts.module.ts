import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller.js';
import { AttemptsService } from './attempts.service.js';
import { ExamCatalogController } from './exam-catalog.controller.js';
import { ExamCatalogService } from './exam-catalog.service.js';

// Học viên: xem đề đã xuất bản, làm bài (bắt đầu, tự động lưu, khôi phục, hủy).
// Nộp bài và chấm điểm (SPRINT-52) sẽ thêm vào module này
@Module({
  controllers: [ExamCatalogController, AttemptsController],
  providers: [ExamCatalogService, AttemptsService],
})
export class AttemptsModule {}
