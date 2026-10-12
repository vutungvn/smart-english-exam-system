import { Module } from '@nestjs/common';
import { QuestionGroupsController } from './question-groups.controller.js';
import { QuestionGroupsService } from './question-groups.service.js';
import { QuestionReferencesService } from './question-references.service.js';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';

// Ngân hàng câu hỏi của giáo viên: câu hỏi và nhóm câu dùng chung đoạn văn/audio
@Module({
  controllers: [QuestionsController, QuestionGroupsController],
  providers: [QuestionsService, QuestionGroupsService, QuestionReferencesService],
  // Module Đề thi (Sprint 3) sẽ dùng lại để kiểm tra câu hỏi khi thêm vào đề
  exports: [QuestionsService],
})
export class QuestionsModule {}
