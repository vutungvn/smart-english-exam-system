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

  @ApiProperty({ description: 'Bản giáo viên chấm đối chiếu (chưa thấy điểm AI khi chấm)' })
  blindReview: boolean;
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

  @ApiProperty({
    description:
      'Đang chấm đối chiếu: bản AI bị ẩn (aiAssessment, aiScore, aiStatus null) tới khi giáo viên lưu',
  })
  blind: boolean;

  @ApiProperty({ type: [ReviewCriterionOption], description: 'Tiêu chí 0–5 của kỹ năng' })
  criteriaOptions: ReviewCriterionOption[];

  @ApiProperty({
    type: [ReviewSubScoreOption],
    description: 'Speaking Part 1: chấm 2 điểm con thay cho điểm câu; câu khác rỗng',
  })
  subScoreOptions: ReviewSubScoreOption[];
}

/** Câu tiếp theo để chấm đối chiếu */
export class CalibrationSample {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'null: không còn câu nào AI đã chấm mà giáo viên chưa chấm',
  })
  answerId: string | null;

  @ApiProperty({ type: 'integer', description: 'Số câu còn có thể chấm đối chiếu' })
  remaining: number;
}

/** Chỉ số độ lệch giữa điểm AI và điểm giáo viên của một nhóm câu */
export class AgreementRow {
  @ApiProperty({ enum: Skill, enumName: 'Skill', nullable: true, description: 'null: toàn bộ' })
  skill: Skill | null;

  @ApiProperty({ type: 'integer', nullable: true, description: 'null: cả kỹ năng' })
  part: number | null;

  @ApiProperty({ type: 'integer', description: 'Số câu có cả điểm AI và điểm giáo viên' })
  count: number;

  @ApiProperty({ type: 'number', description: 'Độ lệch tuyệt đối trung bình |AI − GV| (điểm)' })
  mae: number;

  @ApiProperty({ type: 'number', description: 'Như mae nhưng quy về % thang của câu' })
  maePercent: number;

  @ApiProperty({
    type: 'number',
    description: 'Độ lệch có dấu trung bình (AI − GV, % thang): dương là AI chấm cao hơn',
  })
  biasPercent: number;

  @ApiProperty({ type: 'number', description: '% câu AI cho đúng bằng điểm giáo viên' })
  exactRate: number;

  @ApiProperty({ type: 'number', description: '% câu lệch không quá 1 điểm' })
  withinOneRate: number;

  @ApiProperty({ type: 'number', description: 'Điểm AI trung bình (% thang)' })
  aiMeanPercent: number;

  @ApiProperty({ type: 'number', description: 'Điểm giáo viên trung bình (% thang)' })
  teacherMeanPercent: number;
}

/** Một câu có cả điểm AI và điểm giáo viên */
export class AgreementPair {
  @ApiProperty({ format: 'uuid' })
  answerId: string;

  @ApiProperty()
  examTitle: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ type: 'integer' })
  questionNumber: number;

  @ApiProperty({ type: 'number' })
  aiScore: number;

  @ApiProperty({ type: 'number' })
  teacherScore: number;

  @ApiProperty({ type: 'number' })
  maxScore: number;

  @ApiProperty({ type: 'number', description: 'AI − GV (điểm)' })
  diff: number;

  @ApiProperty()
  blindReview: boolean;

  @ApiProperty({ type: String, nullable: true })
  reviewerName: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewedAt: Date | null;
}

/** Độ lệch AI chấm so với giáo viên (SPRINT-90) */
export class AgreementStats {
  @ApiProperty({ type: AgreementRow, description: 'Toàn bộ mẫu' })
  overall: AgreementRow;

  @ApiProperty({ type: [AgreementRow], description: 'Theo kỹ năng (part = null)' })
  bySkill: AgreementRow[];

  @ApiProperty({ type: [AgreementRow], description: 'Theo kỹ năng và Part' })
  byPart: AgreementRow[];

  @ApiProperty({
    type: [AgreementPair],
    description: 'Mọi cặp điểm, lệch nhiều nhất trước (xem lại prompt, xuất CSV cho báo cáo)',
  })
  pairs: AgreementPair[];
}
