import { ApiProperty } from '@nestjs/swagger';
import { Difficulty, QuestionStatus, QuestionType, Skill } from '../../generated/prisma/enums.js';

// Khai báo các class được tham chiếu trước, vì decorator đọc chúng ngay khi nạp file

export const MEDIA_URL_NOTE =
  'URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp';

export class TopicRef {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'P3/P4 – Chi tiết' })
  name: string;
}

export class AuthorRef {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Giáo viên mẫu' })
  fullName: string;
}

export class QuestionOptionItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'A' })
  label: string;

  @ApiProperty({ example: 'He is reading a newspaper.' })
  content: string;

  @ApiProperty()
  isCorrect: boolean;
}

/** Một dòng trong danh sách câu hỏi */
export class QuestionSummary {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'P5-001',
    description: 'Mã câu trong tệp nhập; câu tạo bằng form thì null',
  })
  code: string | null;

  @ApiProperty({ type: TopicRef })
  topic: TopicRef;

  @ApiProperty({ type: AuthorRef })
  author: AuthorRef;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  groupId: string | null;

  @ApiProperty({ type: 'integer', nullable: true })
  orderInGroup: number | null;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type: QuestionType;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer', example: 5 })
  part: number;

  @ApiProperty({ enum: Difficulty, enumName: 'Difficulty' })
  difficulty: Difficulty;

  @ApiProperty({ enum: QuestionStatus, enumName: 'QuestionStatus' })
  status: QuestionStatus;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Gửi lại nguyên giá trị này khi PATCH để kiểm tra xung đột (khóa lạc quan)',
  })
  updatedAt: Date;
}

/** Đầy đủ một câu hỏi: màn sửa câu hỏi, xem chi tiết */
export class QuestionDetail extends QuestionSummary {
  @ApiProperty({ type: String, nullable: true })
  explanation: string | null;

  @ApiProperty({ type: String, nullable: true })
  sampleAnswer: string | null;

  @ApiProperty({ type: 'integer', nullable: true })
  prepSeconds: number | null;

  @ApiProperty({ type: 'integer', nullable: true })
  responseSeconds: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Key trong kho tệp, gán khi nhập .zip',
  })
  audioKey: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Key trong kho tệp, gán khi nhập .zip',
  })
  imageKey: string | null;

  @ApiProperty({ type: String, nullable: true, description: MEDIA_URL_NOTE })
  audioUrl: string | null;

  @ApiProperty({ type: String, nullable: true, description: MEDIA_URL_NOTE })
  imageUrl: string | null;

  @ApiProperty({ type: [QuestionOptionItem], description: 'Rỗng với câu trả lời mở' })
  options: QuestionOptionItem[];
}

export class QuestionGroupSummary {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: TopicRef })
  topic: TopicRef;

  @ApiProperty({ type: AuthorRef })
  author: AuthorRef;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer', example: 3 })
  part: number;

  @ApiProperty({ type: String, nullable: true })
  passage: string | null;

  @ApiProperty({ type: String, nullable: true })
  transcript: string | null;

  @ApiProperty({ type: String, nullable: true })
  audioKey: string | null;

  @ApiProperty({ type: String, nullable: true })
  imageKey: string | null;

  @ApiProperty({ type: String, nullable: true, description: MEDIA_URL_NOTE })
  audioUrl: string | null;

  @ApiProperty({ type: String, nullable: true, description: MEDIA_URL_NOTE })
  imageUrl: string | null;

  @ApiProperty({ enum: QuestionStatus, enumName: 'QuestionStatus' })
  status: QuestionStatus;

  @ApiProperty({ type: 'integer', description: 'Số câu còn hiệu lực trong nhóm' })
  questionCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class QuestionGroupDetail extends QuestionGroupSummary {
  @ApiProperty({ type: [QuestionSummary], description: 'Các câu trong nhóm, theo thứ tự' })
  questions: QuestionSummary[];
}
