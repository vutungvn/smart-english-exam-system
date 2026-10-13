import { ApiProperty } from '@nestjs/swagger';
import { Difficulty, QuestionStatus, Skill } from '../../generated/prisma/enums.js';

export const IMPORT_ISSUE_SHEETS = ['file', 'groups', 'questions', 'media'] as const;
export type ImportIssueSheet = (typeof IMPORT_ISSUE_SHEETS)[number];

/** Một lỗi hoặc cảnh báo, chỉ đúng ô trong Excel để người soạn sửa */
export class ImportIssue {
  @ApiProperty({
    enum: IMPORT_ISSUE_SHEETS,
    description: 'file: cấu trúc tệp; groups, questions: sheet trong Excel; media: thư mục media/',
  })
  sheet: ImportIssueSheet;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    example: 5,
    description: 'Số dòng trong Excel (dòng 1 là tiêu đề)',
  })
  row: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'option_d' })
  column: string | null;

  @ApiProperty({ example: 'Listening Part 2 (Question-Response) chỉ có phương án A, B, C' })
  message: string;
}

export class ImportPartCount {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ example: 'Conversations' })
  name: string;

  @ApiProperty({ type: 'integer' })
  groupCount: number;

  @ApiProperty({ type: 'integer' })
  questionCount: number;
}

/** Một câu hợp lệ sẽ được nhập (để giáo viên soát lại trước khi xác nhận) */
export class ImportQuestionRow {
  @ApiProperty({ type: 'integer', example: 2 })
  row: number;

  @ApiProperty({ example: 'P5-001' })
  code: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: 'integer' })
  part: number;

  @ApiProperty({ enum: Difficulty, enumName: 'Difficulty' })
  difficulty: Difficulty;

  @ApiProperty({ example: 'P5/P6 – Từ loại' })
  topic: string;

  @ApiProperty({ type: String, nullable: true, example: 'P3-G01' })
  groupCode: string | null;

  @ApiProperty({ type: 'integer', nullable: true })
  orderInGroup: number | null;

  @ApiProperty({ description: 'Nội dung câu, cắt ngắn 120 ký tự' })
  content: string;

  @ApiProperty({ type: String, nullable: true, example: 'P1-003.mp3' })
  audioFile: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'P1-003.jpg' })
  imageFile: string | null;
}

export class ImportPreview {
  @ApiProperty({ format: 'uuid', description: 'Dùng cho /{token}/confirm và /{token}/errors' })
  token: string;

  @ApiProperty({ example: 'toeic-reading.zip' })
  fileName: string;

  @ApiProperty({ type: String, format: 'date-time', description: 'Sau thời điểm này phải tải lại' })
  expiresAt: string;

  @ApiProperty({ description: 'false khi còn lỗi: phải sửa tệp rồi tải lên lại' })
  canConfirm: boolean;

  @ApiProperty({ type: 'integer', description: 'Số nhóm hợp lệ' })
  groupCount: number;

  @ApiProperty({ type: 'integer', description: 'Số câu hợp lệ' })
  questionCount: number;

  @ApiProperty({ type: 'integer', description: 'Số tệp audio/ảnh được dùng' })
  mediaCount: number;

  @ApiProperty({ type: 'integer' })
  errorCount: number;

  @ApiProperty({ type: 'integer' })
  warningCount: number;

  @ApiProperty({ type: [ImportPartCount] })
  parts: ImportPartCount[];

  @ApiProperty({
    type: [ImportIssue],
    description: 'Tối đa 500 lỗi đầu tiên; đầy đủ trong GET /{token}/errors',
  })
  errors: ImportIssue[];

  @ApiProperty({ type: [ImportIssue], description: 'Tối đa 500 cảnh báo đầu tiên' })
  warnings: ImportIssue[];

  @ApiProperty({ type: [ImportQuestionRow], description: 'Các câu hợp lệ, theo thứ tự dòng' })
  questions: ImportQuestionRow[];
}

export class ImportResult {
  @ApiProperty({ type: 'integer' })
  groupCount: number;

  @ApiProperty({ type: 'integer' })
  questionCount: number;

  @ApiProperty({ type: 'integer', description: 'Số tệp audio/ảnh đã lưu vào kho' })
  mediaCount: number;

  @ApiProperty({ enum: QuestionStatus, enumName: 'QuestionStatus' })
  status: QuestionStatus;
}
