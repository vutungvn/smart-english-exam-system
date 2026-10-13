import { Module } from '@nestjs/common';
import { QuestionImportController } from './question-import.controller.js';
import { QuestionImportService } from './question-import.service.js';

// Nhập câu hỏi từ tệp .zip (xlsx + media/). Export service để script seed (SPRINT-49) dùng lại
@Module({
  controllers: [QuestionImportController],
  providers: [QuestionImportService],
  exports: [QuestionImportService],
})
export class QuestionImportModule {}
