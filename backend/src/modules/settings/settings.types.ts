import { ApiProperty } from '@nestjs/swagger';
import { AiSettingsDto, RecordingSettingsDto, ScoringSettingsDto } from './dto/settings.dto.js';

// Khai báo class con trước class cha vì decorator của class cha tham chiếu tới chúng

export class SettingRange {
  @ApiProperty({ example: 7 })
  min: number;

  @ApiProperty({ example: 30 })
  max: number;
}

export class SettingConversionRule {
  @ApiProperty({ example: 5 })
  minScore: number;

  @ApiProperty({ example: 495 })
  maxScore: number;

  @ApiProperty({ example: 5, description: 'Điểm là bội số của step' })
  step: number;
}

export class ScoringRules {
  @ApiProperty({ type: SettingConversionRule })
  listening: SettingConversionRule;

  @ApiProperty({ type: SettingConversionRule })
  reading: SettingConversionRule;

  @ApiProperty({ type: SettingConversionRule })
  speaking: SettingConversionRule;

  @ApiProperty({ type: SettingConversionRule })
  writing: SettingConversionRule;

  @ApiProperty({ type: SettingRange, description: 'Số mốc của mỗi bảng' })
  points: SettingRange;
}

export class AiRanges {
  @ApiProperty({ type: SettingRange })
  dailyBudget: SettingRange;

  @ApiProperty({ type: SettingRange })
  explainDailyLimit: SettingRange;
}

export class RecordingRanges {
  @ApiProperty({ type: SettingRange })
  retentionDays: SettingRange;
}

export class SettingEditor {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Quản trị viên' })
  fullName: string;
}

export class SettingGroupInfo {
  @ApiProperty({ description: 'true: đang dùng đúng giá trị mặc định' })
  isDefault: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Gửi lại trong PATCH, reset để kiểm tra xung đột',
  })
  updatedAt: Date;

  @ApiProperty({ type: SettingEditor, nullable: true, description: 'null: chưa ai sửa' })
  updatedBy: SettingEditor | null;
}

export class ScoringSettingsView extends SettingGroupInfo {
  @ApiProperty({ type: ScoringSettingsDto })
  values: ScoringSettingsDto;

  @ApiProperty({ type: ScoringSettingsDto })
  defaults: ScoringSettingsDto;

  @ApiProperty({ type: ScoringRules })
  rules: ScoringRules;
}

export class AiSettingsView extends SettingGroupInfo {
  @ApiProperty({ type: AiSettingsDto })
  values: AiSettingsDto;

  @ApiProperty({ type: AiSettingsDto })
  defaults: AiSettingsDto;

  @ApiProperty({ type: AiRanges })
  ranges: AiRanges;
}

export class RecordingSettingsView extends SettingGroupInfo {
  @ApiProperty({ type: RecordingSettingsDto })
  values: RecordingSettingsDto;

  @ApiProperty({ type: RecordingSettingsDto })
  defaults: RecordingSettingsDto;

  @ApiProperty({ type: RecordingRanges })
  ranges: RecordingRanges;
}

// GET /admin/settings; mọi thao tác ghi cũng trả lại toàn bộ để FE thay thẳng vào cache
export class AdminSettings {
  @ApiProperty({ type: ScoringSettingsView })
  scoring: ScoringSettingsView;

  @ApiProperty({ type: AiSettingsView })
  ai: AiSettingsView;

  @ApiProperty({ type: RecordingSettingsView })
  recording: RecordingSettingsView;
}

export class RecordingImpact {
  @ApiProperty({
    example: 12,
    description: 'Số bản ghi âm sẽ bị xóa ở lần dọn kế tiếp (3 giờ sáng)',
  })
  recordingCount: number;
}

export class PublicSettings {
  @ApiProperty({ example: 30, description: 'Số ngày giữ bản ghi âm Speaking' })
  recordingRetentionDays: number;
}
