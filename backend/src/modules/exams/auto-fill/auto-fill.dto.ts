import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { Skill } from '../../../generated/prisma/enums.js';

export const AutoFillScope = {
  /** Chỉ rút các Part chưa có câu; Part đã có câu giữ nguyên */
  EMPTY_PARTS: 'EMPTY_PARTS',
  /** Xóa toàn bộ câu hiện có rồi rút lại cả đề */
  ALL: 'ALL',
} as const;
export type AutoFillScope = (typeof AutoFillScope)[keyof typeof AutoFillScope];

export class DifficultyRatioDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 30 })
  @IsInt({ message: 'Tỉ lệ phải là số nguyên' })
  @Min(0, { message: 'Tỉ lệ từ 0 đến 100' })
  @Max(100, { message: 'Tỉ lệ từ 0 đến 100' })
  easy: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 50 })
  @IsInt({ message: 'Tỉ lệ phải là số nguyên' })
  @Min(0, { message: 'Tỉ lệ từ 0 đến 100' })
  @Max(100, { message: 'Tỉ lệ từ 0 đến 100' })
  medium: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 20 })
  @IsInt({ message: 'Tỉ lệ phải là số nguyên' })
  @Min(0, { message: 'Tỉ lệ từ 0 đến 100' })
  @Max(100, { message: 'Tỉ lệ từ 0 đến 100' })
  hard: number;
}

export class TopicMinDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'topicId không hợp lệ' })
  topicId: string;

  @ApiProperty({
    minimum: 1,
    maximum: 100,
    description: 'Số tối thiểu: câu với Part câu đơn, nhóm với Part nhóm',
  })
  @IsInt({ message: 'Số tối thiểu phải là số nguyên' })
  @Min(1, { message: 'Số tối thiểu từ 1' })
  @Max(100, { message: 'Số tối thiểu tối đa 100' })
  min: number;
}

export class AutoFillPartDto {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  @IsEnum(Skill, { message: 'skill không hợp lệ' })
  skill: Skill;

  @ApiProperty({ minimum: 1, maximum: 7 })
  @IsInt({ message: 'part phải là số nguyên' })
  @Min(1, { message: 'part từ 1 đến 7' })
  @Max(7, { message: 'part từ 1 đến 7' })
  part: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    description:
      'Chỉ đề PERCENT: số câu (Part câu đơn) hoặc số nhóm (Part nhóm). Đề TOEIC theo chuẩn',
  })
  @IsOptional()
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng từ 1 đến 100' })
  @Max(100, { message: 'Số lượng từ 1 đến 100' })
  count?: number;

  @ApiPropertyOptional({ type: DifficultyRatioDto, description: 'Bỏ trống: 30/50/20' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyRatioDto)
  difficulty?: DifficultyRatioDto;

  @ApiPropertyOptional({ type: [TopicMinDto], maxItems: 20 })
  @IsOptional()
  @IsArray({ message: 'topics phải là mảng' })
  @ArrayMaxSize(20, { message: 'Tối đa 20 chủ đề mỗi Part' })
  @ValidateNested({ each: true })
  @Type(() => TopicMinDto)
  topics?: TopicMinDto[];
}

export class AutoFillPreviewDto {
  @ApiProperty({ enum: AutoFillScope, enumName: 'AutoFillScope' })
  @IsEnum(AutoFillScope, { message: 'scope không hợp lệ' })
  scope: AutoFillScope;

  @ApiPropertyOptional({
    maxLength: 64,
    description: 'Bỏ trống: server tự tạo; gửi lại để ra cùng kết quả',
  })
  @IsOptional()
  @IsString({ message: 'seed phải là chuỗi' })
  @MaxLength(64, { message: 'seed tối đa 64 ký tự' })
  seed?: string;

  @ApiProperty({ description: 'Ưu tiên câu chưa dùng ở đề khác' })
  @IsBoolean({ message: 'preferUnused phải là true hoặc false' })
  preferUnused: boolean;

  @ApiProperty({
    type: [AutoFillPartDto],
    maxItems: 15,
    description:
      'Đề TOEIC: cấu hình riêng từng Part (Part không gửi dùng mặc định). Đề PERCENT: các Part cần rút',
  })
  @IsArray({ message: 'parts phải là mảng' })
  @ArrayMaxSize(15, { message: 'Tối đa 15 Part' })
  @ValidateNested({ each: true })
  @Type(() => AutoFillPartDto)
  parts: AutoFillPartDto[];
}

export class AutoFillApplyPartDto {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  @IsEnum(Skill, { message: 'skill không hợp lệ' })
  skill: Skill;

  @ApiProperty({ minimum: 1, maximum: 7 })
  @IsInt({ message: 'part phải là số nguyên' })
  @Min(1, { message: 'part từ 1 đến 7' })
  @Max(7, { message: 'part từ 1 đến 7' })
  part: number;

  @ApiPropertyOptional({ type: [String], format: 'uuid', maxItems: 100 })
  @IsOptional()
  @IsArray({ message: 'questionIds phải là mảng' })
  @ArrayMaxSize(100, { message: 'Tối đa 100 câu mỗi Part' })
  @IsUUID('all', { each: true, message: 'questionIds có id không hợp lệ' })
  questionIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid', maxItems: 30 })
  @IsOptional()
  @IsArray({ message: 'groupIds phải là mảng' })
  @ArrayMaxSize(30, { message: 'Tối đa 30 nhóm mỗi Part' })
  @IsUUID('all', { each: true, message: 'groupIds có id không hợp lệ' })
  groupIds?: string[];
}

export class AutoFillApplyDto {
  @ApiProperty({ enum: AutoFillScope, enumName: 'AutoFillScope' })
  @IsEnum(AutoFillScope, { message: 'scope không hợp lệ' })
  scope: AutoFillScope;

  @ApiProperty({ type: String, format: 'date-time', description: 'updatedAt của đề lúc xem trước' })
  @IsDateString({}, { message: 'updatedAt phải là thời điểm ISO 8601' })
  updatedAt: string;

  @ApiProperty({
    type: [AutoFillApplyPartDto],
    maxItems: 15,
    description: 'Kết quả của bản xem trước, đúng thứ tự câu trong từng Part',
  })
  @IsArray({ message: 'parts phải là mảng' })
  @ArrayMinSize(1, { message: 'Chưa có Part nào để áp dụng' })
  @ArrayMaxSize(15, { message: 'Tối đa 15 Part' })
  @ValidateNested({ each: true })
  @Type(() => AutoFillApplyPartDto)
  parts: AutoFillApplyPartDto[];
}
