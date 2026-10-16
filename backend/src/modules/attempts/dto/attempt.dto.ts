import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { AttemptMode, ScoringScale, Skill } from '../../../generated/prisma/enums.js';

export class ExamCatalogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ScoringScale, enumName: 'ScoringScale' })
  @IsOptional()
  @IsEnum(ScoringScale, { message: 'scoringScale không hợp lệ' })
  scoringScale?: ScoringScale;

  @ApiPropertyOptional({
    enum: Skill,
    enumName: 'Skill',
    description: 'Đề có Part của kỹ năng này',
  })
  @IsOptional()
  @IsEnum(Skill, { message: 'skill không hợp lệ' })
  skill?: Skill;

  @ApiPropertyOptional({ description: 'Tìm theo tên đề (không phân biệt hoa thường)' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'q phải là chuỗi' })
  @MaxLength(200, { message: 'Từ khóa tối đa 200 ký tự' })
  q?: string;
}

export class StartAttemptDto {
  @ApiProperty({
    enum: AttemptMode,
    enumName: 'AttemptMode',
    description: 'FULL: làm cả đề, đếm giờ · PART: luyện riêng một Part, không đếm giờ',
  })
  @IsEnum(AttemptMode, { message: 'mode chỉ nhận FULL hoặc PART' })
  mode: AttemptMode;

  @ApiPropertyOptional({ format: 'uuid', description: 'Bắt buộc khi mode = PART' })
  @IsOptional()
  @IsUUID('all', { message: 'sectionId không hợp lệ' })
  sectionId?: string;
}

const TEXT_MAX = 10000;

/** Không gửi trường = giữ nguyên; gửi null = xóa (bỏ chọn phương án, xóa bài viết) */
export class SaveAnswerDto {
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('all', { message: 'selectedOptionId không hợp lệ' })
  selectedOptionId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: TEXT_MAX,
    description: 'Câu Writing',
  })
  @IsOptional()
  @IsString({ message: 'textAnswer phải là chuỗi' })
  @MaxLength(TEXT_MAX, { message: `Bài viết tối đa ${TEXT_MAX} ký tự` })
  textAnswer?: string | null;

  @ApiPropertyOptional({ description: 'Đánh dấu để xem lại' })
  @IsOptional()
  @IsBoolean({ message: 'isFlagged phải là true hoặc false' })
  isFlagged?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Lúc học viên trả lời (mặc định: lúc server nhận); bản mới hơn được giữ',
  })
  @IsOptional()
  @IsDateString({}, { message: 'answeredAt phải là thời điểm ISO 8601' })
  answeredAt?: string;
}

// OmitType: lấy lại các trường (kèm validate) trừ answeredAt, vì ở đây answeredAt bắt buộc
export class SyncAnswerItemDto extends OmitType(SaveAnswerDto, ['answeredAt'] as const) {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'examQuestionId không hợp lệ' })
  examQuestionId: string;

  @ApiProperty({ type: String, format: 'date-time', description: 'Bắt buộc khi đồng bộ lô' })
  @IsDateString({}, { message: 'answeredAt phải là thời điểm ISO 8601' })
  answeredAt: string;
}

/** Hàng đợi câu trả lời lưu ở máy khi mất mạng, gửi lại một lần khi có mạng */
export class SyncAnswersDto {
  @ApiProperty({ type: [SyncAnswerItemDto], minItems: 1, maxItems: 250 })
  @IsArray({ message: 'answers phải là mảng' })
  @ArrayMinSize(1, { message: 'Cần ít nhất 1 câu trả lời' })
  @ArrayMaxSize(250, { message: 'Mỗi lần đồng bộ tối đa 250 câu trả lời' })
  @ValidateNested({ each: true })
  @Type(() => SyncAnswerItemDto)
  answers: SyncAnswerItemDto[];
}
