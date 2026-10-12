import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';
import {
  Difficulty,
  QuestionStatus,
  QuestionType,
  Skill,
} from '../../../generated/prisma/enums.js';

// DTO chỉ kiểm tra từng trường riêng lẻ (kiểu, độ dài). Quy tắc giữa các trường
// (Part nào dùng loại câu nào, mấy phương án...) nằm ở question-rules.ts theo TOEIC_PARTS.

export class QuestionOptionDto {
  @ApiProperty({ example: 'A', description: 'Theo thứ tự hiển thị: A, B, C, D' })
  @IsString({ message: 'Nhãn phương án phải là chuỗi' })
  @Matches(/^[A-D]$/, { message: 'Nhãn phương án là A, B, C hoặc D' })
  label: string;

  @ApiProperty({ example: 'He is reading a newspaper.', maxLength: 1000 })
  @Trim()
  @IsString({ message: 'Nội dung phương án phải là chuỗi' })
  @Length(1, 1000, { message: 'Nội dung phương án dài từ 1 đến 1000 ký tự' })
  content: string;

  @ApiProperty()
  @IsBoolean({ message: 'isCorrect phải là true hoặc false' })
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ format: 'uuid', description: 'Lấy từ GET /subjects/{id}/topics?skill=&part=' })
  @IsUUID('all', { message: 'topicId không hợp lệ' })
  topicId: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  @IsEnum(Skill, { message: 'skill không hợp lệ' })
  skill: Skill;

  @ApiProperty({ minimum: 1, maximum: 7, description: 'LR 1–7; Speaking 1–5; Writing 1–3' })
  @IsInt({ message: 'part phải là số nguyên' })
  @Min(1, { message: 'part từ 1 đến 7' })
  @Max(7, { message: 'part từ 1 đến 7' })
  part: number;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  @IsEnum(QuestionType, { message: 'type không hợp lệ' })
  type: QuestionType;

  @ApiProperty({ enum: Difficulty, enumName: 'Difficulty' })
  @IsEnum(Difficulty, { message: 'difficulty không hợp lệ' })
  difficulty: Difficulty;

  @ApiPropertyOptional({ enum: QuestionStatus, enumName: 'QuestionStatus', default: 'DRAFT' })
  @IsOptional()
  @IsEnum(QuestionStatus, { message: 'status không hợp lệ' })
  status?: QuestionStatus;

  @ApiProperty({
    example: 'The manager asked ___ to finish the report by Friday.',
    maxLength: 5000,
  })
  @Trim()
  @IsString({ message: 'Nội dung câu hỏi phải là chuỗi' })
  @Length(1, 5000, { message: 'Nội dung câu hỏi dài từ 1 đến 5000 ký tự' })
  content: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Giải thích phải là chuỗi' })
  @MaxLength(5000, { message: 'Giải thích tối đa 5000 ký tự' })
  explanation?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 10000,
    description: 'Bắt buộc với Speaking, Writing; bỏ trống với câu trắc nghiệm',
  })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Câu trả lời mẫu phải là chuỗi' })
  @MaxLength(10000, { message: 'Câu trả lời mẫu tối đa 10000 ký tự' })
  sampleAnswer?: string | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true, minimum: 0, maximum: 300 })
  @IsOptional()
  @IsInt({ message: 'prepSeconds phải là số nguyên' })
  @Min(0, { message: 'prepSeconds không âm' })
  @Max(300, { message: 'prepSeconds tối đa 300 giây' })
  prepSeconds?: number | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true, minimum: 1, maximum: 3600 })
  @IsOptional()
  @IsInt({ message: 'responseSeconds phải là số nguyên' })
  @Min(1, { message: 'responseSeconds tối thiểu 1 giây' })
  @Max(3600, { message: 'responseSeconds tối đa 3600 giây' })
  responseSeconds?: number | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('all', { message: 'groupId không hợp lệ' })
  groupId?: string | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt({ message: 'orderInGroup phải là số nguyên' })
  @Min(1, { message: 'orderInGroup tối thiểu là 1' })
  @Max(20, { message: 'orderInGroup tối đa là 20' })
  orderInGroup?: number | null;

  @ApiPropertyOptional({
    type: [QuestionOptionDto],
    description: 'Câu trắc nghiệm: đủ số phương án của Part, đúng 1 đáp án đúng. Câu mở: bỏ trống',
  })
  @IsOptional()
  @IsArray({ message: 'options phải là mảng' })
  @ArrayMaxSize(4, { message: 'Tối đa 4 phương án' })
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}
