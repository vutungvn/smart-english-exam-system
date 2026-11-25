import { ApiProperty, type ApiPropertyOptions } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, Max, Min, ValidateNested } from 'class-validator';
import { RAW_MAX, SETTING_RANGES } from '../../../infra/settings/settings.schema.js';

// DTO chỉ kiểm tra kiểu; khoảng giá trị và quan hệ giữa các tham số kiểm tra ở validateSettings
// (settings.schema.ts) để luật nằm một chỗ

const { conversionPoints, dailyBudget, explainDailyLimit, retentionDays } = SETTING_RANGES;

export class ConversionPointDto {
  @ApiProperty({
    example: 50,
    minimum: 0,
    maximum: RAW_MAX,
    description: 'LR: số câu đúng; SW: tỉ lệ % điểm thô',
  })
  @IsInt({ message: 'Mốc phải là số nguyên' })
  raw: number;

  @ApiProperty({ example: 250, description: 'Điểm quy đổi' })
  @IsInt({ message: 'Điểm phải là số nguyên' })
  score: number;
}

const TABLE: ApiPropertyOptions = {
  type: [ConversionPointDto],
  minItems: conversionPoints.min,
  maxItems: conversionPoints.max,
};
const TABLE_MESSAGE = { message: 'Bảng quy đổi phải là mảng' };

export class ScoringSettingsDto {
  @ApiProperty(TABLE)
  @IsArray(TABLE_MESSAGE)
  @ValidateNested({ each: true })
  @Type(() => ConversionPointDto)
  listening: ConversionPointDto[];

  @ApiProperty(TABLE)
  @IsArray(TABLE_MESSAGE)
  @ValidateNested({ each: true })
  @Type(() => ConversionPointDto)
  reading: ConversionPointDto[];

  @ApiProperty(TABLE)
  @IsArray(TABLE_MESSAGE)
  @ValidateNested({ each: true })
  @Type(() => ConversionPointDto)
  speaking: ConversionPointDto[];

  @ApiProperty(TABLE)
  @IsArray(TABLE_MESSAGE)
  @ValidateNested({ each: true })
  @Type(() => ConversionPointDto)
  writing: ConversionPointDto[];
}

export class AiSettingsDto {
  @ApiProperty({
    example: 1000,
    minimum: dailyBudget.min,
    maximum: dailyBudget.max,
    description: 'Tổng lượt gọi AI mỗi ngày của cả hệ thống',
  })
  @IsInt({ message: 'Tổng lượt AI mỗi ngày phải là số nguyên' })
  dailyBudget: number;

  @ApiProperty({
    example: 20,
    minimum: explainDailyLimit.min,
    maximum: explainDailyLimit.max,
    description: 'Lượt giải thích đáp án của mỗi học viên mỗi ngày',
  })
  @IsInt({ message: 'Lượt giải thích đáp án phải là số nguyên' })
  explainDailyLimit: number;
}

export class RecordingSettingsDto {
  @ApiProperty({
    example: 30,
    minimum: retentionDays.min,
    maximum: retentionDays.max,
    description: 'Số ngày giữ bản ghi âm Speaking sau khi nộp bài',
  })
  @IsInt({ message: 'Số ngày giữ bản ghi âm phải là số nguyên' })
  retentionDays: number;
}

const UPDATED_AT: ApiPropertyOptions = {
  type: String,
  format: 'date-time',
  description: 'updatedAt nhận được lần đọc gần nhất; đã có người sửa sau đó thì trả 409',
};
const UPDATED_AT_MESSAGE = { message: 'updatedAt phải là thời điểm ISO 8601' };

export class UpdateScoringSettingsDto extends ScoringSettingsDto {
  @ApiProperty(UPDATED_AT)
  @IsDateString({}, UPDATED_AT_MESSAGE)
  updatedAt: string;
}

export class UpdateAiSettingsDto extends AiSettingsDto {
  @ApiProperty(UPDATED_AT)
  @IsDateString({}, UPDATED_AT_MESSAGE)
  updatedAt: string;
}

export class UpdateRecordingSettingsDto extends RecordingSettingsDto {
  @ApiProperty(UPDATED_AT)
  @IsDateString({}, UPDATED_AT_MESSAGE)
  updatedAt: string;
}

export class ResetSettingsDto {
  @ApiProperty(UPDATED_AT)
  @IsDateString({}, UPDATED_AT_MESSAGE)
  updatedAt: string;
}

const RETENTION_MESSAGE = {
  message: `retentionDays từ ${retentionDays.min} đến ${retentionDays.max}`,
};

export class RecordingImpactQueryDto {
  @ApiProperty({ example: 15, minimum: retentionDays.min, maximum: retentionDays.max })
  @Type(() => Number)
  @IsInt(RETENTION_MESSAGE)
  @Min(retentionDays.min, RETENTION_MESSAGE)
  @Max(retentionDays.max, RETENTION_MESSAGE)
  retentionDays: number;
}
