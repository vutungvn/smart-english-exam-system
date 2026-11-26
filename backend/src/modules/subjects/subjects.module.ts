import { Module } from '@nestjs/common';
import { AdminSubjectsController } from './admin-subjects.controller.js';
import { AdminSubjectsService } from './admin-subjects.service.js';
import { SubjectsController } from './subjects.controller.js';
import { SubjectsService } from './subjects.service.js';

// Công khai: danh sách chương trình thi, chủ đề đang dùng. Admin: thêm, sửa, ẩn, xóa (SPRINT-69)
@Module({
  controllers: [SubjectsController, AdminSubjectsController],
  providers: [SubjectsService, AdminSubjectsService],
})
export class SubjectsModule {}
