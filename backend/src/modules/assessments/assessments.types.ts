import { ApiProperty } from '@nestjs/swagger';
import { AssessmentStatus, Grader } from '../../generated/prisma/enums.js';

/** Một tiêu chí chấm (thang 0–5), dùng để chẩn đoán điểm mạnh/yếu, không cộng vào điểm câu */
export class AssessmentCriterion {
  @ApiProperty({
    example: 'grammar',
    description:
      'Writing: grammar · vocabulary · coherence · task; Speaking: pronunciation · intonation · fluency · grammar · vocabulary · task',
  })
  key: string;

  @ApiProperty({ example: 'Ngữ pháp' })
  label: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 5 })
  score: number;
}

/** Điểm con của Speaking Part 1 (đọc thành tiếng): phát âm 0–3, ngữ điệu 0–3, cộng lại là điểm câu */
export class AssessmentSubScore {
  @ApiProperty({ example: 'pronunciation', description: 'pronunciation · intonation' })
  key: string;

  @ApiProperty({ example: 'Phát âm' })
  label: string;

  @ApiProperty({ type: 'integer' })
  score: number;

  @ApiProperty({ type: 'integer', example: 3 })
  max: number;
}

/** Câu sai → câu sửa (Writing) */
export class AssessmentCorrection {
  @ApiProperty({ example: 'A man ride a bicycle.' })
  original: string;

  @ApiProperty({ example: 'A man is riding a bicycle.' })
  corrected: string;

  @ApiProperty({ example: 'Hành động đang diễn ra trong tranh nên dùng hiện tại tiếp diễn.' })
  explanation: string;
}

/** Kết quả chấm một câu Speaking/Writing ở màn xem lại */
export class QuestionAssessment {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: Grader,
    enumName: 'Grader',
    description: 'AI: điểm ước lượng do AI chấm · TEACHER: giáo viên đã chấm lại (điểm chính thức)',
  })
  grader: Grader;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Tên giáo viên chấm (grader = TEACHER)',
  })
  reviewerName: string | null;

  @ApiProperty({ enum: AssessmentStatus, enumName: 'AssessmentStatus' })
  status: AssessmentStatus;

  @ApiProperty({ type: 'number', nullable: true, description: 'Điểm câu theo thang của dạng câu' })
  score: number | null;

  @ApiProperty({
    type: 'number',
    description: 'Writing P1: 3 · P2: 4 · P3: 5; Speaking P1: 6 · P2–P4: 3 · P5: 5',
  })
  maxScore: number;

  @ApiProperty({ type: [AssessmentCriterion], description: 'Rỗng khi chưa chấm xong' })
  criteria: AssessmentCriterion[];

  @ApiProperty({ type: String, nullable: true, description: 'Nhận xét tiếng Việt' })
  feedback: string | null;

  @ApiProperty({
    type: [AssessmentSubScore],
    description: 'Speaking Part 1: phát âm + ngữ điệu; câu khác rỗng',
  })
  subScores: AssessmentSubScore[];

  @ApiProperty({ type: String, nullable: true, description: 'Speaking: lời nói AI nhận dạng được' })
  transcript: string | null;

  @ApiProperty({ type: [AssessmentCorrection], description: 'Writing; Speaking rỗng' })
  corrections: AssessmentCorrection[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Writing: bài viết lại tốt hơn; Speaking: câu trả lời gợi ý',
  })
  improvedAnswer: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Lý do chấm lỗi (FAILED), không chứa nội dung bài làm',
  })
  errorMessage: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'AI tạm hết lượt hôm nay: dự kiến chấm tiếp lúc này',
  })
  nextRunAt: Date | null;

  @ApiProperty({ type: 'integer', description: 'Số lần học viên còn được bấm "Chấm lại"' })
  regradesLeft: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  gradedAt: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Khóa lạc quan khi giáo viên sửa lại bản chấm của mình',
  })
  updatedAt: Date;
}

/** Học viên đã yêu cầu giáo viên chấm lại câu này (SPRINT-91) */
export class AssessmentReviewRequest {
  @ApiProperty({ type: String, format: 'date-time' })
  requestedAt: Date;

  @ApiProperty({ example: 'Em nghĩ bài nói đã trả lời đủ ý nhưng AI cho điểm thấp.' })
  note: string;
}

/** Tiến độ chấm Speaking/Writing của một lượt làm bài */
export class GradingProgress {
  @ApiProperty({ type: 'integer', description: 'Số câu cần AI chấm (câu bỏ trống không tính)' })
  total: number;

  @ApiProperty({ type: 'integer' })
  done: number;

  @ApiProperty({ type: 'integer', description: 'Đang chờ chấm (kể cả chờ lượt AI ngày mới)' })
  pending: number;

  @ApiProperty({ type: 'integer', description: 'Chấm lỗi, học viên có thể bấm "Chấm lại"' })
  failed: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'AI tạm hết lượt hôm nay: các câu còn lại chấm tiếp lúc này',
  })
  waitingUntil: Date | null;
}
