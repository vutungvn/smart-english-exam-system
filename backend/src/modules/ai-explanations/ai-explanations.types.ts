import { ApiProperty } from '@nestjs/swagger';

export class AiQuota {
  @ApiProperty({ description: 'Số lượt mỗi ngày' })
  limit: number;

  @ApiProperty({ description: 'Đã dùng hôm nay (lấy từ cache không tính)' })
  used: number;

  @ApiProperty()
  remaining: number;

  @ApiProperty({
    description: 'Lúc có lượt mới: 0h giờ Thái Bình Dương (14h hoặc 15h giờ Việt Nam)',
  })
  resetAt: Date;
}

export class AiQuotas {
  @ApiProperty({ type: AiQuota, description: 'Giải thích đáp án bằng AI' })
  explanation: AiQuota;
}

export class ExplanationOption {
  @ApiProperty({ example: 'A' })
  label: string;

  @ApiProperty({ description: 'Vì sao phương án này đúng hoặc sai' })
  reason: string;
}

export class ExplanationKeyPoint {
  @ApiProperty({ example: 'attend (v)', description: 'Từ, cụm từ hoặc điểm ngữ pháp' })
  term: string;

  @ApiProperty({ description: 'Nghĩa và cách dùng' })
  note: string;
}

export class AiExplanation {
  @ApiProperty({ format: 'uuid' })
  examQuestionId: string;

  @ApiProperty({ description: 'Vì sao đáp án đúng là đúng' })
  summary: string;

  @ApiProperty({ type: [ExplanationOption], description: 'Mỗi phương án một mục' })
  options: ExplanationOption[];

  @ApiProperty({ type: [ExplanationKeyPoint], description: 'Từ vựng, ngữ pháp cần nhớ (≤ 5)' })
  keyPoints: ExplanationKeyPoint[];

  @ApiProperty({ description: 'Mẹo làm dạng câu này' })
  tip: string;

  @ApiProperty({ example: 'gemini-3.5-flash-lite', description: '"fake" khi chưa có API key' })
  model: string;

  @ApiProperty({ description: 'Lúc AI sinh lời giải thích' })
  generatedAt: Date;

  @ApiProperty({ description: 'true: lấy từ cache, không tính lượt' })
  cached: boolean;

  @ApiProperty({ type: AiQuota })
  quota: AiQuota;
}
