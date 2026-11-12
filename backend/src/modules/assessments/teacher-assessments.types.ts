import { ApiProperty } from '@nestjs/swagger';
import { AssessmentStatus, QuestionType, Skill } from '../../generated/prisma/enums.js';
import { AssessmentReviewRequest, QuestionAssessment } from './assessments.types.js';

/** Lý do câu nằm trong hàng đợi chấm lại */
export const ReviewReason = {
  /** AI chấm lỗi (FAILED) */
  AI_FAILED: 'AI_FAILED',
  /** Học viên yêu cầu giáo viên chấm lại */
  STUDENT_REQUEST: 'STUDENT_REQUEST',
} as const;
export type ReviewReason = (typeof ReviewReason)[keyof typeof ReviewReason];

/** Một câu Speaking/Writing trong hàng đợi "Bài cần chấm lại" của giáo viên */
export class TeacherReviewItem {
  @ApiProperty({ format: 'uuid', description: 'Id câu trả lời (attempt_answers)' })
  answerId: string;

  @ApiProperty({ example: 'TOEIC Speaking Test 1' })
  examTitle: string;

  @ApiProperty({ description: 'Đề do chính giáo viên đang xem soạn' })
  isMyExam: boolean;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer', example: 3 })
  part: number;

  @ApiProperty({ type: 'integer', description: 'Số thứ tự câu trong Part (theo đề gốc)' })
  questionNumber: number;

  @ApiProperty({
    example: 'HV-3F2A1B',
    description: 'Mã ẩn danh của học viên (không lộ tên, email)',
  })
  studentCode: string;

  @ApiProperty({ type: String, format: 'date-time' })
  submittedAt: Date;

  @ApiProperty({
    enum: ReviewReason,
    enumName: 'ReviewReason',
    isArray: true,
    description: 'AI_FAILED: AI chấm lỗi · STUDENT_REQUEST: học viên yêu cầu chấm lại',
  })
  reasons: ReviewReason[];

  @ApiProperty({ type: String, nullable: true, description: 'Lý do học viên ghi khi yêu cầu' })
  requestNote: string | null;

  @ApiProperty({ enum: AssessmentStatus, enumName: 'AssessmentStatus', nullable: true })
  aiStatus: AssessmentStatus | null;

  @ApiProperty({ type: 'number', nullable: true })
  aiScore: number | null;

  @ApiProperty({ type: 'number' })
  maxScore: number;

  @ApiProperty({ type: 'number', nullable: true, description: 'Điểm giáo viên (đã chấm lại)' })
  teacherScore: number | null;

  @ApiProperty({ type: String, nullable: true })
  reviewerName: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewedAt: Date | null;
}

/** Tiêu chí giáo viên có thể chấm (0–5) theo kỹ năng */
export class ReviewCriterionOption {
  @ApiProperty({ example: 'grammar' })
  key: string;

  @ApiProperty({ example: 'Ngữ pháp' })
  label: string;
}

/** Điểm con Speaking Part 1 */
export class ReviewSubScoreOption {
  @ApiProperty({ example: 'pronunciation' })
  key: string;

  @ApiProperty({ example: 'Phát âm' })
  label: string;

  @ApiProperty({ type: 'integer', example: 3 })
  max: number;
}

/** Đề bài của câu đang chấm (bản hiện tại trong ngân hàng câu hỏi) */
export class ReviewQuestionContent {
  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type: QuestionType;

  @ApiProperty()
  content: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Ảnh của câu (Writing P1, Speaking P2)',
  })
  imageUrl: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Đoạn văn, bảng thông tin của nhóm' })
  passage: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Ảnh của nhóm (Speaking P4)' })
  groupImageUrl: string | null;

  @ApiProperty({ type: String, nullable: true })
  sampleAnswer: string | null;

  @ApiProperty({ type: 'integer', nullable: true })
  responseSeconds: number | null;
}

/** Bài làm của học viên */
export class ReviewStudentAnswer {
  @ApiProperty({ type: String, nullable: true, description: 'Bài viết (Writing)' })
  textAnswer: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL ký để nghe bài nói; null khi đã tự xóa sau thời hạn lưu',
  })
  recordingUrl: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  recordingDeletedAt: Date | null;
}

/** Màn chấm một câu của giáo viên */
export class TeacherReviewDetail extends TeacherReviewItem {
  @ApiProperty({ type: ReviewQuestionContent })
  question: ReviewQuestionContent;

  @ApiProperty({ type: ReviewStudentAnswer })
  answer: ReviewStudentAnswer;

  @ApiProperty({ type: AssessmentReviewRequest, nullable: true })
  reviewRequest: AssessmentReviewRequest | null;

  @ApiProperty({ type: QuestionAssessment, nullable: true, description: 'Bản AI chấm' })
  aiAssessment: QuestionAssessment | null;

  @ApiProperty({
    type: QuestionAssessment,
    nullable: true,
    description: 'Bản giáo viên đã chấm (sửa lại thì gửi kèm updatedAt của bản này)',
  })
  teacherAssessment: QuestionAssessment | null;

  @ApiProperty({ type: [ReviewCriterionOption], description: 'Tiêu chí 0–5 của kỹ năng' })
  criteriaOptions: ReviewCriterionOption[];

  @ApiProperty({
    type: [ReviewSubScoreOption],
    description: 'Speaking Part 1: chấm 2 điểm con thay cho điểm câu; câu khác rỗng',
  })
  subScoreOptions: ReviewSubScoreOption[];
}
