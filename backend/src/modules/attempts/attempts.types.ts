import { ApiProperty } from '@nestjs/swagger';
import {
  AttemptMode,
  AttemptStatus,
  ExamKind,
  ScoringScale,
  Skill,
} from '../../generated/prisma/enums.js';
import { ExamPaper } from '../exams/exams.types.js';

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

/** Đầy đủ để làm bài hoặc khôi phục bài: đề (không đáp án) + các câu đã trả lời */
export class AttemptDetail extends AttemptSummary {
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
