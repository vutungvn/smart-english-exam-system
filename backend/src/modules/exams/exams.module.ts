import { Module } from '@nestjs/common';
import { ExamAutoFillService } from './auto-fill/auto-fill.service.js';
import { ExamContentService } from './exam-content.service.js';
import { ExamsController } from './exams.controller.js';
import { ExamsService } from './exams.service.js';

// Đề thi của giáo viên: soạn đề từ ngân hàng câu hỏi (tay hoặc rút tự động theo ma trận), kiểm tra,
// xem trước, xuất bản
@Module({
  controllers: [ExamsController],
  providers: [ExamsService, ExamContentService, ExamAutoFillService],
  // Module Làm bài (Giai đoạn 2) dùng lại ExamsService để lấy đề cho học viên
  exports: [ExamsService],
})
export class ExamsModule {}
