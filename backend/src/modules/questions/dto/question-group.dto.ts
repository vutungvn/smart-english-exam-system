import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BulkIdsDto } from '../../../common/dto/bulk-delete.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { QuestionStatus, Skill } from '../../../generated/prisma/enums.js';

export class CreateQuestionGroupDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'topicId không hợp lệ' })
  topicId: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  @IsEnum(Skill, { message: 'skill không hợp lệ' })
  skill: Skill;

  @ApiProperty({
    minimum: 1,
    maximum: 7,
    description: 'Nhóm dùng cho Listening 3, 4; Reading 6, 7; Speaking 4',
  })
  @IsInt({ message: 'part phải là số nguyên' })
  @Min(1, { message: 'part từ 1 đến 7' })
  @Max(7, { message: 'part từ 1 đến 7' })
  part: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 20000,
    description: 'Bắt buộc với Reading 6, 7 và Speaking 4',
  })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Đoạn văn phải là chuỗi' })
  @MaxLength(20000, { message: 'Đoạn văn tối đa 20000 ký tự' })
  passage?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 20000,
    description: 'Bắt buộc với Listening 3, 4. Chỉ hiện ở màn xem lại',
  })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Lời thoại phải là chuỗi' })
  @MaxLength(20000, { message: 'Lời thoại tối đa 20000 ký tự' })
  transcript?: string | null;

  @ApiPropertyOptional({ enum: QuestionStatus, enumName: 'QuestionStatus', default: 'DRAFT' })
  @IsOptional()
  @IsEnum(QuestionStatus, { message: 'status không hợp lệ' })
  status?: QuestionStatus;
}

/** Không đổi được skill, part của nhóm: các câu trong nhóm phải cùng Part với nhóm */
export class UpdateQuestionGroupDto extends PartialType(
  OmitType(CreateQuestionGroupDto, ['skill', 'part'] as const),
) {
  @ApiProperty({ type: String, format: 'date-time', description: 'updatedAt lần đọc gần nhất' })
  @IsDateString({}, { message: 'updatedAt phải là thời điểm ISO 8601' })
  updatedAt: string;
}

export class QuestionGroupQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ enum: QuestionStatus, enumName: 'QuestionStatus' })
  @IsOptional()
  @IsEnum(QuestionStatus, { message: 'status không hợp lệ' })
  status?: QuestionStatus;

  @ApiPropertyOptional({ type: Boolean, description: 'true: chỉ nhóm do tôi tạo' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'mine phải là true hoặc false' })
  mine?: boolean;
}

/** Tham số chuỗi "true"/"false" → boolean (query string luôn là chuỗi) */
const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class DeleteGroupQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'true: xóa luôn các câu trong nhóm; false: nhóm còn câu thì không xóa được',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'withQuestions phải là true hoặc false' })
  withQuestions?: boolean;
}

export class BulkDeleteGroupsDto extends BulkIdsDto {
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'true: xóa luôn các câu trong nhóm; false: bỏ qua nhóm còn câu (NOT_EMPTY)',
  })
  @IsOptional()
  @IsBoolean({ message: 'withQuestions phải là true hoặc false' })
  withQuestions?: boolean;
}
