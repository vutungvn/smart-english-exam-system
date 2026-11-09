import { ApiProperty } from '@nestjs/swagger';
import {
  AttemptMode,
  AttemptStatus,
  ExamKind,
  ScoringScale,
  Skill,
} from '../../generated/prisma/enums.js';
import { GradingProgress, QuestionAssessment } from '../assessments/assessments.types.js';
import { ExamPaper, PaperGroup, PaperOption, PaperQuestion } from '../exams/exams.types.js';

const REMAINING_NOTE =
  'Số giây còn lại do server tính từ expiresAt; null khi không đếm giờ (luyện theo Part)';

// ---------------------------------------------------------------
// Danh sách đề cho học viên
// ---------------------------------------------------------------

/** Bài đang làm dở của chính người xem */
export class MyInProgressRef {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: AttemptMode, enumName: 'AttemptMode' })
  mode: AttemptMode;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sectionId: string | null;

  @ApiProperty({ type: 'integer', nullable: true, description: REMAINING_NOTE })
  remainingSeconds: number | null;
}

export class ExamCatalogItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TOEIC LR – Đề 1' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ enum: ExamKind, enumName: 'ExamKind' })
  kind: ExamKind;

  @ApiProperty({ enum: ScoringScale, enumName: 'ScoringScale' })
  scoringScale: ScoringScale;

  @ApiProperty({ type: 'integer', description: 'Thời gian làm cả đề (phút)' })
  durationMinutes: number;

  @ApiProperty({ type: 'integer', nullable: true, description: 'null: không giới hạn' })
  maxAttempts: number | null;

  @ApiProperty()
  allowPartPractice: boolean;

  @ApiProperty({ description: 'Mỗi lượt làm bài có thứ tự câu riêng' })
  shuffleQuestions: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: Date | null;

  @ApiProperty({
    enum: Skill,
    enumName: 'Skill',
    isArray: true,
    description: 'Theo thứ tự trong đề',
  })
  skills: Skill[];

  @ApiProperty({ type: 'integer' })
  sectionCount: number;

  @ApiProperty({ type: 'integer' })
  questionCount: number;

  @ApiProperty({
    type: 'integer',
    description: 'Số lượt làm cả đề đã dùng (không tính lượt đã hủy và lượt luyện theo Part)',
  })
  attemptsUsed: number;

  @ApiProperty({ type: 'integer', nullable: true, description: 'null: không giới hạn' })
  attemptsLeft: number | null;

  @ApiProperty({ type: MyInProgressRef, nullable: true })
  inProgress: MyInProgressRef | null;
}

export class ExamCatalogSection {
  @ApiProperty({ format: 'uuid', description: 'Gửi khi bắt đầu luyện riêng Part này' })
  id: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ example: 'Photographs' })
  name: string;

  @ApiProperty({ type: 'integer' })
  questionCount: number;
}

export class ExamCatalogDetail extends ExamCatalogItem {
  @ApiProperty({ type: [ExamCatalogSection] })
  sections: ExamCatalogSection[];
}

// ---------------------------------------------------------------
// Lượt làm bài
// ---------------------------------------------------------------

export class AttemptExamRef {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ScoringScale, enumName: 'ScoringScale' })
  scoringScale: ScoringScale;

  @ApiProperty({ type: 'integer' })
  durationMinutes: number;
}

export class AttemptSectionRef {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ example: 'Incomplete Sentences' })
  name: string;
}

export class AttemptAnswerItem {
  @ApiProperty({ format: 'uuid' })
  examQuestionId: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  selectedOptionId: string | null;

  @ApiProperty({ type: String, nullable: true })
  textAnswer: string | null;

  @ApiProperty()
  isFlagged: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  answeredAt: Date;

  @ApiProperty({ description: 'Câu Speaking đã có bài nói tải lên' })
  hasRecording: boolean;
}

export class SaveRecordingResult {
  @ApiProperty({ format: 'uuid' })
  examQuestionId: string;

  @ApiProperty({ description: 'Độ dài bài nói sau khi chuẩn hóa (giây)', example: 28.4 })
  seconds: number;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Số giây còn lại; null khi không đếm giờ',
  })
  remainingSeconds: number | null;
}

export class AttemptSummary {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: AttemptMode, enumName: 'AttemptMode' })
  mode: AttemptMode;

  @ApiProperty({ enum: AttemptStatus, enumName: 'AttemptStatus' })
  status: AttemptStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  startedAt: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt: Date | null;

  @ApiProperty({ type: 'integer', nullable: true, description: REMAINING_NOTE })
  remainingSeconds: number | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Giờ server, để FE bù lệch đồng hồ',
  })
  serverTime: Date;

  @ApiProperty({ type: AttemptExamRef })
  exam: AttemptExamRef;

  @ApiProperty({
    type: AttemptSectionRef,
    nullable: true,
    description: 'Part đang luyện (mode PART)',
  })
  section: AttemptSectionRef | null;
}

/** Bài đang làm dở, cho mục "Làm tiếp" */
export class InProgressAttempt extends AttemptSummary {
  @ApiProperty({ type: 'integer', description: 'Số câu đã chọn đáp án hoặc đã viết' })
  answeredCount: number;

  @ApiProperty({ type: 'integer' })
  totalQuestions: number;
}

export const SCORING_STRATEGIES = ['TOEIC_990', 'TOEIC_SW', 'PERCENT'] as const;

export class SkillScoreItem {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  correct: number;

  @ApiProperty({ type: 'integer' })
  wrong: number;

  @ApiProperty({ type: 'integer', description: 'Câu trắc nghiệm bỏ trống' })
  skipped: number;

  @ApiProperty({ type: 'integer', description: 'Số câu trắc nghiệm của kỹ năng' })
  total: number;

  @ApiProperty({ type: 'integer', description: 'Số câu Speaking/Writing (chấm bằng AI)' })
  openCount: number;

  @ApiProperty({ type: 'number', description: 'Tổng điểm tối đa các câu Speaking/Writing' })
  openMax: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description: 'Tổng điểm các câu Speaking/Writing (bỏ trống 0); null khi còn câu chờ chấm',
  })
  openRaw: number | null;

  @ApiProperty({
    type: 'integer',
    description: 'Số câu Speaking/Writing chưa có điểm (chờ AI chấm hoặc chấm lỗi)',
  })
  openPending: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description:
      'TOEIC LR: 5–495 · TOEIC SW: 0–200 · %: 0–100 · null khi kỹ năng còn câu chờ AI chấm',
  })
  scaled: number | null;
}

/** Kết quả chấm khi nộp bài (chi tiết từng câu, xem lại đáp án: SPRINT-53) */
export class AttemptResult {
  @ApiProperty({ format: 'uuid' })
  attemptId: string;

  @ApiProperty({
    enum: AttemptStatus,
    enumName: 'AttemptStatus',
    description: 'GRADED: đã có điểm · SUBMITTED: còn câu Speaking/Writing chờ AI chấm',
  })
  status: AttemptStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  submittedAt: Date;

  @ApiProperty({
    enum: SCORING_STRATEGIES,
    description:
      'TOEIC_990: làm cả đề TOEIC LR · TOEIC_SW: làm cả đề Speaking/Writing (0–200 mỗi kỹ năng) · ' +
      'PERCENT: đề luyện tập và mọi lượt luyện theo Part',
  })
  scoring: (typeof SCORING_STRATEGIES)[number];

  @ApiProperty({ type: 'integer' })
  correctCount: number;

  @ApiProperty({ type: 'integer' })
  wrongCount: number;

  @ApiProperty({ type: 'integer' })
  skippedCount: number;

  @ApiProperty({ type: 'number', description: 'Số câu trắc nghiệm đúng' })
  rawScore: number;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description:
      'Điểm theo thang (TOEIC 10–990, TOEIC SW 0–400 hoặc %); null khi còn câu chờ AI chấm',
  })
  scaledScore: number | null;

  @ApiProperty({ type: 'integer', description: 'Số câu Speaking/Writing chưa có điểm' })
  pendingOpenCount: number;

  @ApiProperty({ type: [SkillScoreItem] })
  skillScores: SkillScoreItem[];

  @ApiProperty({
    type: GradingProgress,
    nullable: true,
    description: 'Tiến độ AI chấm Speaking/Writing; null với đề chỉ có trắc nghiệm và ở lịch sử',
  })
  grading: GradingProgress | null;
}

/** Đầy đủ để làm bài hoặc khôi phục bài: đề (không đáp án) + các câu đã trả lời */
export class AttemptDetail extends AttemptSummary {
  @ApiProperty({ type: AttemptResult, nullable: true, description: 'Có khi bài đã nộp' })
  result: AttemptResult | null;

  @ApiProperty({ description: 'true: trả lại bài đang làm dở thay vì tạo lượt mới' })
  resumed: boolean;

  @ApiProperty({
    type: ExamPaper,
    description:
      'Không có isCorrect, sampleAnswer, explanation, transcript. Luyện theo Part chỉ có Part đó',
  })
  paper: ExamPaper;

  @ApiProperty({ type: [AttemptAnswerItem] })
  answers: AttemptAnswerItem[];
}

// ---------------------------------------------------------------
// Xem lại bài làm, lịch sử làm bài (SPRINT-53)
// ---------------------------------------------------------------

/**
 * Kết quả từng câu khi xem lại. Câu Speaking/Writing đã trả lời: PENDING (chờ AI chấm), SCORED (đã có
 * điểm), FAILED (chấm lỗi, có thể chấm lại). Câu trả lời mở chưa làm cũng là SKIPPED.
 */
export const ReviewOutcome = {
  CORRECT: 'CORRECT',
  WRONG: 'WRONG',
  SKIPPED: 'SKIPPED',
  PENDING: 'PENDING',
  SCORED: 'SCORED',
  FAILED: 'FAILED',
} as const;
export type ReviewOutcome = (typeof ReviewOutcome)[keyof typeof ReviewOutcome];

export class ReviewOption extends PaperOption {
  @ApiProperty()
  isCorrect: boolean;
}

export class ReviewQuestion extends PaperQuestion {
  @ApiProperty({ type: [ReviewOption], description: 'Có isCorrect; rỗng với câu trả lời mở' })
  declare options: ReviewOption[];

  @ApiProperty({ enum: ReviewOutcome, enumName: 'ReviewOutcome' })
  outcome: ReviewOutcome;

  @ApiProperty({ type: String, format: 'uuid', nullable: true, description: 'Phương án đã chọn' })
  selectedOptionId: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Bài viết (Writing)' })
  textAnswer: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL ký để nghe lại bài nói (Speaking); null khi chưa ghi âm',
  })
  recordingUrl: string | null;

  @ApiProperty()
  isFlagged: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Giải thích đáp án (trắc nghiệm) hoặc gợi ý cách làm (câu trả lời mở)',
  })
  explanation: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Câu trả lời mẫu (Speaking/Writing)' })
  sampleAnswer: string | null;

  @ApiProperty({
    type: QuestionAssessment,
    nullable: true,
    description: 'Kết quả AI chấm câu Speaking/Writing; null với câu trắc nghiệm, câu bỏ trống',
  })
  assessment: QuestionAssessment | null;
}

export class ReviewGroup extends PaperGroup {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Lời thoại Listening (chỉ hiện ở màn xem lại)',
  })
  transcript: string | null;
}

export class ReviewBlock {
  @ApiProperty({ type: ReviewGroup, nullable: true })
  group: ReviewGroup | null;

  @ApiProperty({ type: [ReviewQuestion] })
  questions: ReviewQuestion[];
}

export class ReviewCounts {
  @ApiProperty({ type: 'integer' })
  correct: number;

  @ApiProperty({ type: 'integer' })
  wrong: number;

  @ApiProperty({ type: 'integer' })
  skipped: number;

  @ApiProperty({ type: 'integer', description: 'Câu Speaking/Writing chờ AI chấm' })
  pending: number;

  @ApiProperty({ type: 'integer', description: 'Câu Speaking/Writing đã có điểm AI' })
  scored: number;

  @ApiProperty({ type: 'integer', description: 'Câu Speaking/Writing chấm lỗi' })
  failed: number;
}

export class ReviewSection {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ example: 'Photographs' })
  name: string;

  @ApiProperty({ type: ReviewCounts })
  counts: ReviewCounts;

  @ApiProperty({ type: [ReviewBlock] })
  blocks: ReviewBlock[];
}

/** Bài đã nộp kèm đáp án, giải thích từng câu (nội dung câu hỏi hiện tại trong ngân hàng) */
export class AttemptReview extends AttemptSummary {
  @ApiProperty({ type: AttemptResult })
  result: AttemptResult;

  @ApiProperty({ type: 'integer' })
  totalQuestions: number;

  @ApiProperty({ type: [ReviewSection], description: 'Luyện theo Part chỉ có Part đó' })
  sections: ReviewSection[];
}

/** Một dòng trong lịch sử làm bài (chỉ bài đã nộp) */
export class AttemptHistoryItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: AttemptMode, enumName: 'AttemptMode' })
  mode: AttemptMode;

  @ApiProperty({ type: String, format: 'date-time' })
  startedAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  submittedAt: Date;

  @ApiProperty({
    type: 'integer',
    description: 'Thời gian làm bài (giây), từ lúc bắt đầu đến khi nộp',
  })
  durationSeconds: number;

  @ApiProperty({ description: 'true: hệ thống tự nộp khi hết giờ' })
  autoSubmitted: boolean;

  @ApiProperty({ type: AttemptExamRef })
  exam: AttemptExamRef;

  @ApiProperty({
    type: AttemptSectionRef,
    nullable: true,
    description: 'Part đã luyện (mode PART)',
  })
  section: AttemptSectionRef | null;

  @ApiProperty({ type: AttemptResult })
  result: AttemptResult;
}

export class SaveAnswerResult {
  @ApiProperty({ type: AttemptAnswerItem })
  answer: AttemptAnswerItem;

  @ApiProperty({
    description: 'false: server đã có bản trả lời mới hơn (answeredAt lớn hơn) nên giữ bản đó',
  })
  applied: boolean;

  @ApiProperty({ type: 'integer', nullable: true, description: REMAINING_NOTE })
  remainingSeconds: number | null;
}

export class SyncAnswersResult {
  @ApiProperty({ type: 'integer', description: 'Số câu trả lời đã ghi' })
  applied: number;

  @ApiProperty({
    type: 'integer',
    description: 'Bỏ qua: server có bản mới hơn, hoặc trả lời sau khi đã hết giờ',
  })
  ignored: number;

  @ApiProperty({ type: 'integer', nullable: true, description: REMAINING_NOTE })
  remainingSeconds: number | null;
}
