import { ApiProperty } from '@nestjs/swagger';
import { Difficulty, ScoringScale, Skill } from '../../../generated/prisma/enums.js';
import { AutoFillScope } from './auto-fill.dto.js';

export const AUTO_FILL_UNITS = ['QUESTION', 'GROUP'] as const;
export type AutoFillUnit = (typeof AUTO_FILL_UNITS)[number];

export class DifficultyCount {
  @ApiProperty({ type: 'integer' })
  easy: number;

  @ApiProperty({ type: 'integer' })
  medium: number;

  @ApiProperty({ type: 'integer' })
  hard: number;
}

export class TopicCount {
  @ApiProperty({ format: 'uuid' })
  topicId: string;

  @ApiProperty({ example: 'P5/P6 – Từ loại' })
  name: string;

  @ApiProperty({ type: 'integer' })
  count: number;
}

export class SizeCount {
  @ApiProperty({ type: 'integer', description: 'Số câu mỗi nhóm' })
  size: number;

  @ApiProperty({ type: 'integer', description: 'Số nhóm' })
  count: number;
}

/** Ngân hàng hiện có cho một Part: dùng hiện gợi ý cạnh ma trận */
export class AutoFillCoveragePart {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ example: 'Incomplete Sentences' })
  name: string;

  @ApiProperty({ enum: AUTO_FILL_UNITS, enumName: 'AutoFillUnit' })
  unit: AutoFillUnit;

  @ApiProperty({
    description:
      'Reading Part 7 đề TOEIC: rút đúng 54 câu theo cấu trúc ETS (4×2, 3×3, 3×4, 5×5 câu); chủ đề tính theo nhóm',
  })
  reading7Profile: boolean;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Số lượng chuẩn của đề TOEIC (theo đơn vị); null với đề PERCENT',
  })
  required: number | null;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Số câu chuẩn; null với đề PERCENT',
  })
  requiredQuestions: number | null;

  @ApiProperty({
    type: 'integer',
    description: 'Số câu hoặc nhóm rút được (ACTIVE, đúng định dạng)',
  })
  available: number;

  @ApiProperty({ type: 'integer', description: 'Trong đó chưa dùng ở đề khác' })
  unused: number;

  @ApiProperty({ type: DifficultyCount })
  difficulty: DifficultyCount;

  @ApiProperty({
    type: [TopicCount],
    description: 'Mọi chủ đề của Part (kể cả chủ đề chưa có câu)',
  })
  topics: TopicCount[];

  @ApiProperty({ type: [SizeCount], description: 'Part nhóm: số nhóm theo số câu mỗi nhóm' })
  sizes: SizeCount[];

  @ApiProperty({ type: 'integer', description: 'Số nhóm có biểu đồ (Listening 3, 4)' })
  graphics: number;

  @ApiProperty({
    type: 'integer',
    description: 'Số câu trong đề này hiện có ở Part (0: Part trống)',
  })
  current: number;
}

export class AutoFillCoverage {
  @ApiProperty({ enum: ScoringScale, enumName: 'ScoringScale' })
  scoringScale: ScoringScale;

  @ApiProperty({ type: [AutoFillCoveragePart] })
  parts: AutoFillCoveragePart[];
}

export class AutoFillPreviewItem {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  questionId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  groupId: string | null;

  @ApiProperty({ description: 'Đoạn đầu nội dung câu hoặc đoạn văn' })
  label: string;

  @ApiProperty({ enum: Difficulty, enumName: 'Difficulty' })
  difficulty: Difficulty;

  @ApiProperty()
  topicName: string;

  @ApiProperty({ type: 'integer', description: 'Số đề khác đang dùng' })
  usedCount: number;

  @ApiProperty({ type: 'integer', description: 'Số câu (câu đơn là 1)' })
  questionCount: number;

  @ApiProperty()
  hasGraphic: boolean;
}

export class AutoFillPreviewPart {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: AUTO_FILL_UNITS, enumName: 'AutoFillUnit' })
  unit: AutoFillUnit;

  @ApiProperty({
    description:
      'Reading Part 7 đề TOEIC: rút đúng 54 câu theo cấu trúc ETS (4×2, 3×3, 3×4, 5×5 câu); chủ đề tính theo nhóm',
  })
  reading7Profile: boolean;

  @ApiProperty({ description: 'Part đã có câu và phạm vi "chỉ Part trống": giữ nguyên, không rút' })
  kept: boolean;

  @ApiProperty({ type: 'integer', description: 'Số lượng cần (Reading Part 7 đề TOEIC: số câu)' })
  required: number;

  @ApiProperty({ type: 'integer' })
  selected: number;

  @ApiProperty({ type: 'integer' })
  shortage: number;

  @ApiProperty({ type: 'integer', description: 'Số câu đã chọn' })
  questionCount: number;

  @ApiProperty({ type: [String], description: 'Các ràng buộc đã nới' })
  relaxed: string[];

  @ApiProperty({ type: DifficultyCount })
  difficulty: DifficultyCount;

  @ApiProperty({ type: [TopicCount] })
  topics: TopicCount[];

  @ApiProperty({ type: [AutoFillPreviewItem] })
  items: AutoFillPreviewItem[];
}

export class AutoFillPreview {
  @ApiProperty({ description: 'Gửi lại cùng seed và ma trận để ra cùng kết quả' })
  seed: string;

  @ApiProperty({ enum: AutoFillScope, enumName: 'AutoFillScope' })
  scope: AutoFillScope;

  @ApiProperty({ type: 'integer', description: 'Tổng số câu sẽ có trong đề sau khi áp dụng' })
  totalQuestions: number;

  @ApiProperty({ type: [AutoFillPreviewPart] })
  parts: AutoFillPreviewPart[];
}
