import { ApiProperty } from '@nestjs/swagger';
import { AssessmentStatus } from '../../generated/prisma/enums.js';

/** Một tiêu chí chấm (thang 0–5), dùng để chẩn đoán điểm mạnh/yếu, không cộng vào điểm câu */
export class AssessmentCriterion {
  @ApiProperty({ example: 'grammar', description: 'grammar · vocabulary · coherence · task' })
  key: string;

  @ApiProperty({ example: 'Ngữ pháp' })
  label: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 5 })
  score: number;
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

  @ApiProperty({ enum: AssessmentStatus, enumName: 'AssessmentStatus' })
  status: AssessmentStatus;

  @ApiProperty({ type: 'number', nullable: true, description: 'Điểm câu theo thang của dạng câu' })
  score: number | null;

  @ApiProperty({ type: 'number', description: 'Writing P1: 3 · P2: 4 · P3: 5' })
  maxScore: number;

  @ApiProperty({ type: [AssessmentCriterion], description: 'Rỗng khi chưa chấm xong' })
  criteria: AssessmentCriterion[];

  @ApiProperty({ type: String, nullable: true, description: 'Nhận xét tiếng Việt' })
  feedback: string | null;

  @ApiProperty({ type: [AssessmentCorrection] })
  corrections: AssessmentCorrection[];

  @ApiProperty({ type: String, nullable: true, description: 'Bài viết lại tốt hơn' })
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
