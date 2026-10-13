import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { ExamStatus, ScoringScale } from '../../../generated/prisma/enums.js';

export class CreateExamDto {
  @ApiProperty({ format: 'uuid', description: 'Chương trình thi, lấy từ GET /subjects' })
  @IsUUID('all', { message: 'subjectId không hợp lệ' })
  subjectId: string;

  @ApiProperty({ example: 'TOEIC LR – Đề số 1', maxLength: 255 })
  @Trim()
  @IsString({ message: 'Tên đề phải là chuỗi' })
  @Length(1, 255, { message: 'Tên đề dài từ 1 đến 255 ký tự' })
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(2000, { message: 'Mô tả tối đa 2000 ký tự' })
  description?: string | null;

  @ApiProperty({
    enum: ScoringScale,
    enumName: 'ScoringScale',
    description:
      'TOEIC_990: đề Listening + Reading đủ 7 Part · TOEIC_SW: đề Speaking và/hoặc Writing · PERCENT: luyện theo Part',
  })
  @IsEnum(ScoringScale, { message: 'scoringScale không hợp lệ' })
  scoringScale: ScoringScale;

  @ApiProperty({ minimum: 1, maximum: 300, example: 120 })
  @IsInt({ message: 'Thời gian làm bài phải là số nguyên (phút)' })
  @Min(1, { message: 'Thời gian làm bài tối thiểu 1 phút' })
  @Max(300, { message: 'Thời gian làm bài tối đa 300 phút' })
  durationMinutes: number;

  @ApiPropertyOptional({
    type: 'integer',
    nullable: true,
    minimum: 1,
    maximum: 100,
    description: 'Bỏ trống hoặc null: không giới hạn số lần làm',
  })
  @IsOptional()
  @IsInt({ message: 'Số lần làm tối đa phải là số nguyên' })
  @Min(1, { message: 'Số lần làm tối đa tối thiểu là 1' })
  @Max(100, { message: 'Số lần làm tối đa là 100' })
  maxAttempts?: number | null;

  @ApiPropertyOptional({ default: true, description: 'Cho phép học viên làm riêng từng Part' })
  @IsOptional()
  @IsBoolean({ message: 'allowPartPractice phải là true hoặc false' })
  allowPartPractice?: boolean;
}

/** Không đổi được chương trình thi; đổi thang điểm chỉ khi đề chưa có phần thi (kiểm tra ở Service) */
export class UpdateExamDto extends PartialType(OmitType(CreateExamDto, ['subjectId'] as const)) {
  @ApiProperty({ type: String, format: 'date-time', description: 'updatedAt lần đọc gần nhất' })
  @IsDateString({}, { message: 'updatedAt phải là thời điểm ISO 8601' })
  updatedAt: string;
}

export class ExamQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExamStatus, enumName: 'ExamStatus' })
  @IsOptional()
  @IsEnum(ExamStatus, { message: 'status không hợp lệ' })
  status?: ExamStatus;

  @ApiPropertyOptional({ enum: ScoringScale, enumName: 'ScoringScale' })
  @IsOptional()
  @IsEnum(ScoringScale, { message: 'scoringScale không hợp lệ' })
  scoringScale?: ScoringScale;

  @ApiPropertyOptional({ description: 'Tìm theo tên đề (không phân biệt hoa thường)' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'q phải là chuỗi' })
  @MaxLength(200, { message: 'Từ khóa tối đa 200 ký tự' })
  q?: string;
}
