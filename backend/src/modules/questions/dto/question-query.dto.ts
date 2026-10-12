import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Trim } from '../../../common/transforms/trim.transform.js';
import {
  Difficulty,
  QuestionStatus,
  QuestionType,
  Skill,
} from '../../../generated/prisma/enums.js';

export const QUESTION_SORTS = [
  'createdAt:desc',
  'createdAt:asc',
  'updatedAt:desc',
  'updatedAt:asc',
  'part:asc',
  'part:desc',
] as const;
export type QuestionSort = (typeof QUESTION_SORTS)[number];

// Query string luôn là chuỗi: "true"/"false" → boolean trước khi validate
const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class QuestionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Skill, enumName: 'Skill' })
  @IsOptional()
  @IsEnum(Skill, { message: 'skill không hợp lệ' })
  skill?: Skill;

  @ApiPropertyOptional({ minimum: 1, maximum: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'part phải là số nguyên' })
  @Min(1, { message: 'part từ 1 đến 7' })
  @Max(7, { message: 'part từ 1 đến 7' })
  part?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'topicId không hợp lệ' })
  topicId?: string;

  @ApiPropertyOptional({ enum: QuestionType, enumName: 'QuestionType' })
  @IsOptional()
  @IsEnum(QuestionType, { message: 'type không hợp lệ' })
  type?: QuestionType;

  @ApiPropertyOptional({ enum: Difficulty, enumName: 'Difficulty' })
  @IsOptional()
  @IsEnum(Difficulty, { message: 'difficulty không hợp lệ' })
  difficulty?: Difficulty;

  @ApiPropertyOptional({ enum: QuestionStatus, enumName: 'QuestionStatus' })
  @IsOptional()
  @IsEnum(QuestionStatus, { message: 'status không hợp lệ' })
  status?: QuestionStatus;

  @ApiPropertyOptional({ format: 'uuid', description: 'Chỉ lấy câu thuộc nhóm này' })
  @IsOptional()
  @IsUUID('all', { message: 'groupId không hợp lệ' })
  groupId?: string;

  @ApiPropertyOptional({ description: 'Tìm trong nội dung câu hỏi (không phân biệt hoa thường)' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'q phải là chuỗi' })
  @MaxLength(200, { message: 'Từ khóa tối đa 200 ký tự' })
  q?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'true: chỉ câu do tôi tạo' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'mine phải là true hoặc false' })
  mine?: boolean;

  @ApiPropertyOptional({ enum: QUESTION_SORTS, default: 'createdAt:desc' })
  @IsOptional()
  @IsIn(QUESTION_SORTS, { message: `sort thuộc: ${QUESTION_SORTS.join(', ')}` })
  sort: QuestionSort = 'createdAt:desc';
}
