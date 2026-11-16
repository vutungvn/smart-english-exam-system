import type { z } from 'zod';
import type { AiFeature } from '../../generated/prisma/enums.js';

/** Ảnh hoặc âm thanh gửi kèm prompt */
export interface AiAttachment {
  mimeType: string;
  data: Buffer;
}

/** Một lần gọi model: provider chỉ lo gửi và nhận, không biết hạn mức, thử lại */
export interface AiProviderRequest {
  model: string;
  systemInstruction: string;
  prompt: string;
  attachments: AiAttachment[];
  /** JSON Schema của kết quả (sinh từ Zod), ép model trả đúng cấu trúc */
  jsonSchema: unknown;
  temperature: number;
  /** FakeAiProvider trả kết quả này thay cho model thật */
  fake: () => unknown;
}

export interface AiProviderResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiGenerateRequest<T> {
  feature: AiFeature;
  /** Người dùng gây ra lượt gọi; null khi hệ thống tự gọi */
  userId: string | null;
  /** Lượt mỗi ngày của người dùng cho tính năng này; không có thì chỉ tính ngân sách chung */
  userDailyLimit?: number;
  /** Phần ngân sách chung tính năng này được dùng (0–1), mặc định toàn bộ */
  budgetShare?: number;
  schema: z.ZodType<T>;
  systemInstruction: string;
  prompt: string;
  attachments?: AiAttachment[];
  /** Thấp để kết quả ổn định, mặc định 0.2 */
  temperature?: number;
  /** Kết quả mẫu khi chưa có GEMINI_API_KEY */
  fake: () => T;
}

export interface AiGenerateResult<T> {
  data: T;
  /** Model đã trả kết quả (model chính, model dự phòng hoặc "fake") */
  model: string;
}

export interface AiQuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  /** Lúc có lượt mới */
  resetAt: Date;
}
