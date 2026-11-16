import { ApiProperty } from '@nestjs/swagger';
import {
  ExamKind,
  ExamStatus,
  QuestionType,
  ScoringScale,
  Skill,
} from '../../generated/prisma/enums.js';
import { MEDIA_URL_NOTE, QuestionSummary } from '../questions/questions.types.js';

// Khai báo các class được tham chiếu trước, vì decorator đọc chúng ngay khi nạp file

export class SubjectRef {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TOEIC' })
  code: string;

  @ApiProperty({ example: 'TOEIC 4 kỹ năng' })
  name: string;
}

/** Một dòng trong danh sách đề */
export class ExamSummary {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: SubjectRef })
  subject: SubjectRef;

  @ApiProperty({ enum: ExamKind, enumName: 'ExamKind' })
  kind: ExamKind;

  @ApiProperty({ example: 'TOEIC LR – Đề số 1' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ enum: ScoringScale, enumName: 'ScoringScale' })
  scoringScale: ScoringScale;

  @ApiProperty({ type: 'integer', example: 120 })
  durationMinutes: number;

  @ApiProperty({ type: 'integer', nullable: true, description: 'null: không giới hạn' })
  maxAttempts: number | null;

  @ApiProperty()
  allowPartPractice: boolean;

  @ApiProperty({ description: 'Đảo thứ tự câu trong từng Part theo từng lượt làm bài' })
  shuffleQuestions: boolean;

  @ApiProperty({ enum: ExamStatus, enumName: 'ExamStatus' })
  status: ExamStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ type: 'integer' })
  sectionCount: number;

  @ApiProperty({ type: 'integer' })
  questionCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Gửi lại nguyên giá trị này khi PATCH để kiểm tra xung đột (khóa lạc quan)',
  })
  updatedAt: Date;
}

export class ExamQuestionItem {
  @ApiProperty({ format: 'uuid', description: 'Id của câu trong đề (dùng khi gỡ câu khỏi đề)' })
  id: string;

  @ApiProperty({ type: 'integer' })
  orderIndex: number;

  @ApiProperty({
    type: QuestionSummary,
    description: 'Câu trong ngân hàng; các câu cùng groupId nằm liền nhau (một khối)',
  })
  question: QuestionSummary;
}

export class ExamSectionItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer', example: 5 })
  part: number;

  @ApiProperty({ example: 'Incomplete Sentences' })
  name: string;

  @ApiProperty({ type: 'integer' })
  questionCount: number;

  @ApiProperty({ type: [ExamQuestionItem] })
  questions: ExamQuestionItem[];
}

/** Đề kèm các phần thi và câu hỏi: màn soạn đề */
export class ExamDetail extends ExamSummary {
  @ApiProperty({ type: [ExamSectionItem], description: 'Theo thứ tự Part chuẩn của TOEIC' })
  sections: ExamSectionItem[];
}

// ---------------------------------------------------------------
// Kiểm tra điều kiện xuất bản
// ---------------------------------------------------------------

export const ExamIssueLevel = {
  /** Chặn xuất bản */
  ERROR: 'ERROR',
  /** Chỉ nhắc, vẫn xuất bản được (ví dụ câu Listening chưa có tệp âm thanh) */
  WARNING: 'WARNING',
} as const;
export type ExamIssueLevel = (typeof ExamIssueLevel)[keyof typeof ExamIssueLevel];

export const ExamIssueCode = {
  NO_SECTIONS: 'NO_SECTIONS',
  MISSING_PART: 'MISSING_PART',
  EMPTY_SECTION: 'EMPTY_SECTION',
  WRONG_QUESTION_COUNT: 'WRONG_QUESTION_COUNT',
  QUESTION_REMOVED: 'QUESTION_REMOVED',
  QUESTION_NOT_ACTIVE: 'QUESTION_NOT_ACTIVE',
  GROUP_NOT_ACTIVE: 'GROUP_NOT_ACTIVE',
  GROUP_SIZE: 'GROUP_SIZE',
  GROUP_INCOMPLETE: 'GROUP_INCOMPLETE',
  MISSING_MEDIA: 'MISSING_MEDIA',
  DURATION: 'DURATION',
} as const;
export type ExamIssueCode = (typeof ExamIssueCode)[keyof typeof ExamIssueCode];

export class ExamIssue {
  @ApiProperty({ enum: Object.values(ExamIssueLevel), enumName: 'ExamIssueLevel' })
  level: ExamIssueLevel;

  @ApiProperty({ enum: Object.values(ExamIssueCode), enumName: 'ExamIssueCode' })
  code: ExamIssueCode;

  @ApiProperty({ example: 'Listening Part 2 (Question-Response) cần 25 câu, đang có 20' })
  message: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sectionId: string | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Câu trong ngân hàng, để FE mở thẳng câu cần sửa',
  })
  questionId: string | null;
}

export class ExamPartCheck {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ example: 'Question-Response' })
  name: string;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Số câu chuẩn TOEIC; null với đề luyện tập (PERCENT)',
  })
  expected: number | null;

  @ApiProperty({ type: 'integer' })
  actual: number;
}

export class ExamValidation {
  @ApiProperty({ description: 'true khi không còn lỗi mức ERROR' })
  publishable: boolean;

  @ApiProperty({ type: 'integer' })
  totalQuestions: number;

  @ApiProperty({ type: [ExamPartCheck] })
  parts: ExamPartCheck[];

  @ApiProperty({ type: [ExamIssue] })
  issues: ExamIssue[];
}

// ---------------------------------------------------------------
// Xem trước: đề đúng như học viên nhận (không có đáp án, câu trả lời mẫu, lời thoại).
// Giai đoạn 2 dùng lại hình dạng này khi học viên bắt đầu làm bài.
// ---------------------------------------------------------------

export class PaperOption {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'A' })
  label: string;

  @ApiProperty()
  content: string;
}

export class PaperQuestion {
  @ApiProperty({ type: 'integer', description: 'Số câu liên tục trong cả đề: 1, 2, 3…' })
  number: number;

  @ApiProperty({ format: 'uuid' })
  examQuestionId: string;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type: QuestionType;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: String, nullable: true })
  audioKey: string | null;

  @ApiProperty({ type: String, nullable: true })
  imageKey: string | null;

  @ApiProperty({ type: String, nullable: true, description: MEDIA_URL_NOTE })
  audioUrl: string | null;

  @ApiProperty({ type: String, nullable: true, description: MEDIA_URL_NOTE })
  imageUrl: string | null;

  @ApiProperty({ type: 'integer', nullable: true })
  prepSeconds: number | null;

  @ApiProperty({ type: 'integer', nullable: true })
  responseSeconds: number | null;

  @ApiProperty({ type: [PaperOption], description: 'Không có isCorrect; rỗng với câu trả lời mở' })
  options: PaperOption[];
}

export class PaperGroup {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, nullable: true, description: 'Đoạn văn, bảng thông tin' })
  passage: string | null;

  @ApiProperty({ type: String, nullable: true })
  audioKey: string | null;

  @ApiProperty({ type: String, nullable: true })
  imageKey: string | null;

  @ApiProperty({ type: String, nullable: true, description: MEDIA_URL_NOTE })
  audioUrl: string | null;

  @ApiProperty({ type: String, nullable: true, description: MEDIA_URL_NOTE })
  imageUrl: string | null;
}

/** Câu đơn (group = null) hoặc một nhóm câu dùng chung đoạn văn/audio */
export class PaperBlock {
  @ApiProperty({ type: PaperGroup, nullable: true })
  group: PaperGroup | null;

  @ApiProperty({ type: [PaperQuestion] })
  questions: PaperQuestion[];
}

export class PaperSection {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ example: 'Photographs' })
  name: string;

  @ApiProperty({ type: [PaperBlock] })
  blocks: PaperBlock[];
}

export class ExamPaper {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ScoringScale, enumName: 'ScoringScale' })
  scoringScale: ScoringScale;

  @ApiProperty({ type: 'integer' })
  durationMinutes: number;

  @ApiProperty({ type: 'integer' })
  totalQuestions: number;

  @ApiProperty({ type: [PaperSection] })
  sections: PaperSection[];
}
