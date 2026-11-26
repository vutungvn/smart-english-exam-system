import { ApiProperty } from '@nestjs/swagger';
import { Skill, SubjectCategory } from '../../generated/prisma/enums.js';

// GET /admin/subjects: kèm chương trình đang ẩn và số liệu để admin biết xóa được hay không
export class AdminSubjectItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TOEIC' })
  code: string;

  @ApiProperty({ example: 'TOEIC 4 kỹ năng' })
  name: string;

  @ApiProperty({ enum: SubjectCategory, enumName: 'SubjectCategory' })
  category: SubjectCategory;

  @ApiProperty({ description: 'false: đang ẩn' })
  isActive: boolean;

  @ApiProperty({ description: 'Chương trình hệ thống (TOEIC): không ẩn, không xóa được' })
  isProtected: boolean;

  @ApiProperty({ example: 29 })
  topicCount: number;

  @ApiProperty({ example: 12, description: 'Đề thi chưa xóa' })
  examCount: number;

  @ApiProperty({ example: 300, description: 'Câu hỏi chưa xóa thuộc các chủ đề của chương trình' })
  questionCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Gửi lại trong PATCH để kiểm tra xung đột',
  })
  updatedAt: Date;
}

export class AdminTopicItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: [Number], example: [5, 6] })
  parts: number[];

  @ApiProperty({ example: 'P5/P6 – Từ loại' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ example: 25, description: 'Câu hỏi chưa xóa dùng chủ đề này' })
  questionCount: number;

  @ApiProperty({ example: 3, description: 'Nhóm câu chưa xóa dùng chủ đề này' })
  groupCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Gửi lại trong PATCH để kiểm tra xung đột',
  })
  updatedAt: Date;
}
