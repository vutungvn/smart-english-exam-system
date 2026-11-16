import { ApiProperty } from '@nestjs/swagger';
import { AttemptMode, Skill } from '../../generated/prisma/enums.js';
import {
  AttemptExamRef,
  AttemptSectionRef,
  SCORING_STRATEGIES,
  SkillScoreItem,
} from '../attempts/attempts.types.js';
import { PROGRESS_RANGES, type ProgressRange } from './progress-stats.js';

const ACCURACY_NOTE =
  '% đúng trên tổng câu trắc nghiệm (câu bỏ trống tính là sai); null khi chưa làm câu nào';

// ---------------------------------------------------------------
// Biểu đồ điểm theo thời gian
// ---------------------------------------------------------------

/** Một bài đã nộp trên biểu đồ điểm */
export class ScoreTrendPoint {
  @ApiProperty({ format: 'uuid' })
  attemptId: string;

  @ApiProperty({ type: String, format: 'date-time' })
  submittedAt: Date;

  @ApiProperty({ enum: AttemptMode, enumName: 'AttemptMode' })
  mode: AttemptMode;

  @ApiProperty({ type: AttemptExamRef })
  exam: AttemptExamRef;

  @ApiProperty({
    type: AttemptSectionRef,
    nullable: true,
    description: 'Part đã luyện (mode PART)',
  })
  section: AttemptSectionRef | null;

  @ApiProperty({
    enum: SCORING_STRATEGIES,
    description: 'TOEIC_990: làm cả đề TOEIC LR · PERCENT: đề luyện tập, lượt luyện theo Part',
  })
  scoring: (typeof SCORING_STRATEGIES)[number];

  @ApiProperty({
    type: 'number',
    nullable: true,
    description:
      'Điểm theo thang (TOEIC 10–990 hoặc %); null khi còn câu Speaking/Writing chờ AI chấm',
  })
  scaledScore: number | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description:
      '% câu trắc nghiệm đúng, có cả khi bài còn câu chờ chấm; null khi bài không có câu trắc nghiệm',
  })
  choicePercent: number | null;

  @ApiProperty({ type: 'integer' })
  correctCount: number;

  @ApiProperty({ type: 'integer', description: 'Số câu trắc nghiệm của bài' })
  choiceTotal: number;

  @ApiProperty({ type: [SkillScoreItem], description: 'Điểm từng kỹ năng (TOEIC LR: 5–495)' })
  skillScores: SkillScoreItem[];
}

export class ScoreTrend {
  @ApiProperty({ enum: PROGRESS_RANGES })
  range: ProgressRange;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'null: toàn bộ' })
  from: Date | null;

  @ApiProperty({ type: 'integer', nullable: true, description: 'Điểm mục tiêu TOEIC của học viên' })
  targetScore: number | null;

  @ApiProperty({
    type: [ScoreTrendPoint],
    description: 'Bài đã nộp trong khoảng thời gian, cũ nhất trước (tối đa 200 bài gần nhất)',
  })
  points: ScoreTrendPoint[];
}

// ---------------------------------------------------------------
// Năng lực theo kỹ năng, Part, chủ đề
// ---------------------------------------------------------------

export class AccuracyStat {
  @ApiProperty({
    type: 'integer',
    description: 'Số lượt câu trắc nghiệm (một câu làm ở 2 bài tính 2)',
  })
  total: number;

  @ApiProperty({ type: 'integer' })
  correct: number;

  @ApiProperty({ type: 'integer' })
  wrong: number;

  @ApiProperty({ type: 'integer' })
  skipped: number;

  @ApiProperty({ type: 'number', nullable: true, description: ACCURACY_NOTE })
  accuracy: number | null;
}

export class SkillProgress extends AccuracyStat {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;
}

export class PartProgress extends AccuracyStat {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ example: 'Incomplete Sentences' })
  name: string;
}

export class TopicProgress extends AccuracyStat {
  @ApiProperty({ format: 'uuid' })
  topicId: string;

  @ApiProperty({ example: 'P5/P6 – Từ loại' })
  name: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer', isArray: true, description: 'Part dùng chủ đề này' })
  parts: number[];
}

export class ProgressOverview {
  @ApiProperty({ type: 'integer', description: 'Số bài đã nộp (cả đề + luyện Part)' })
  submittedCount: number;

  @ApiProperty({ type: 'integer' })
  fullCount: number;

  @ApiProperty({ type: 'integer' })
  partCount: number;

  @ApiProperty({ type: 'integer', description: 'Tổng lượt câu trắc nghiệm' })
  choiceTotal: number;

  @ApiProperty({ type: 'integer' })
  choiceCorrect: number;

  @ApiProperty({ type: 'number', nullable: true, description: ACCURACY_NOTE })
  accuracy: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSubmittedAt: Date | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Điểm TOEIC LR cao nhất (chỉ bài làm cả đề TOEIC LR)',
  })
  bestToeicScore: number | null;

  @ApiProperty({ type: 'number', nullable: true, description: 'Điểm TOEIC LR của bài gần nhất' })
  latestToeicScore: number | null;
}

export class ProgressSkills {
  @ApiProperty({ enum: PROGRESS_RANGES })
  range: ProgressRange;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'null: toàn bộ' })
  from: Date | null;

  @ApiProperty({ type: ProgressOverview })
  overview: ProgressOverview;

  @ApiProperty({ type: [SkillProgress], description: 'Chỉ kỹ năng đã làm câu trắc nghiệm' })
  skills: SkillProgress[];

  @ApiProperty({ type: [PartProgress], description: 'Theo thứ tự Part trong đề (L1…L4, R5…R7)' })
  parts: PartProgress[];

  @ApiProperty({
    type: [TopicProgress],
    description:
      'Chủ đề cần luyện thêm: đã làm ≥ minTopicQuestions câu và tỉ lệ đúng < weakAccuracy; yếu nhất trước, tối đa 5',
  })
  weakTopics: TopicProgress[];

  @ApiProperty({ type: 'integer', example: 5 })
  minTopicQuestions: number;

  @ApiProperty({ type: 'number', example: 80 })
  weakAccuracy: number;
}
