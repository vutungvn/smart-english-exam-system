import { AttemptMode, QuestionType } from '../../generated/prisma/enums.js';

// Quy tắc thuần của lượt làm bài (không đụng DB) để test được riêng

/** Lưu từng câu (PUT): cho trễ mạng vài giây sau khi hết giờ */
export const ANSWER_GRACE_SECONDS = 15;
/**
 * Đồng bộ lô sau mất mạng (PATCH): nhận thêm 2 phút sau khi hết giờ, nhưng chỉ giữ câu trả lời có
 * answeredAt trước hạn nộp. Job tự nộp bài (SPRINT-52) phải chạy sau khoảng này
 */
export const SYNC_GRACE_SECONDS = 120;

/** Làm cả đề thì đếm giờ theo thời gian của đề; luyện theo Part thì không đếm giờ */
export function expiresAtFor(mode: AttemptMode, durationMinutes: number, now: Date): Date | null {
  return mode === AttemptMode.FULL ? new Date(now.getTime() + durationMinutes * 60_000) : null;
}

/** Số giây còn lại (làm tròn xuống, không âm); null khi không đếm giờ */
export function remainingSeconds(expiresAt: Date | null, now: Date): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}

/** Còn nhận câu trả lời không (tính cả thời gian ân hạn) */
export function withinDeadline(expiresAt: Date | null, now: Date, graceSeconds: number): boolean {
  return !expiresAt || now.getTime() <= expiresAt.getTime() + graceSeconds * 1000;
}

/**
 * Thời điểm trả lời do client gửi (dùng để giữ bản mới nhất khi đồng bộ). Không tin đồng hồ máy học
 * viên: ép về khoảng [lúc bắt đầu làm bài, bây giờ]
 */
export function clampAnsweredAt(value: string | undefined, startedAt: Date, now: Date): Date {
  const time = value ? new Date(value).getTime() : now.getTime();
  return new Date(Math.min(Math.max(time, startedAt.getTime()), now.getTime()));
}

export interface AnswerTarget {
  type: QuestionType;
  /** Id các phương án của câu hỏi */
  optionIds: ReadonlySet<string>;
}

/** undefined: giữ nguyên giá trị cũ · null: xóa (bỏ chọn, xóa bài viết) */
export interface AnswerInput {
  selectedOptionId?: string | null;
  textAnswer?: string | null;
  isFlagged?: boolean;
}

export interface AnswerValues {
  selectedOptionId: string | null;
  textAnswer: string | null;
  isFlagged: boolean;
}

/** Lỗi gắn với một trường của câu trả lời; null khi hợp lệ */
export function answerProblem(
  target: AnswerTarget,
  input: AnswerInput,
): { field: string; message: string } | null {
  if (
    input.selectedOptionId === undefined &&
    input.textAnswer === undefined &&
    input.isFlagged === undefined
  ) {
    return {
      field: 'selectedOptionId',
      message: 'Cần ít nhất một trong selectedOptionId, textAnswer, isFlagged',
    };
  }

  const option = input.selectedOptionId ?? null;
  const text = input.textAnswer ?? null;
  switch (target.type) {
    // TOEIC_PARTS không dùng MULTIPLE_CHOICE; nếu có thì cũng chỉ lưu một phương án (D25)
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.SINGLE_CHOICE:
      if (text !== null) {
        return { field: 'textAnswer', message: 'Câu trắc nghiệm chỉ chọn phương án' };
      }
      if (option !== null && !target.optionIds.has(option)) {
        return { field: 'selectedOptionId', message: 'Phương án không thuộc câu hỏi này' };
      }
      return null;
    case QuestionType.WRITTEN_RESPONSE:
      if (option !== null) {
        return { field: 'selectedOptionId', message: 'Câu Writing không có phương án để chọn' };
      }
      return null;
    case QuestionType.SPOKEN_RESPONSE:
      if (option !== null || text !== null) {
        return {
          field: option !== null ? 'selectedOptionId' : 'textAnswer',
          message: 'Câu Speaking trả lời bằng ghi âm (làm ở phần Speaking)',
        };
      }
      return null;
  }
}

/** Ghép thay đổi vào câu trả lời đã lưu; chuỗi rỗng coi như xóa bài viết */
export function mergeAnswer(existing: AnswerValues | null, input: AnswerInput): AnswerValues {
  const text = input.textAnswer === undefined ? undefined : input.textAnswer || null;
  return {
    selectedOptionId:
      input.selectedOptionId === undefined
        ? (existing?.selectedOptionId ?? null)
        : input.selectedOptionId,
    textAnswer: text === undefined ? (existing?.textAnswer ?? null) : text,
    isFlagged: input.isFlagged ?? existing?.isFlagged ?? false,
  };
}

/**
 * Ghi câu trả lời bằng một câu SQL INSERT … ON CONFLICT (SPRINT-101): giá trị khi chưa có bản lưu,
 * và trường nào được ghi đè khi đã có. Cho cùng kết quả với mergeAnswer mà không cần đọc bản cũ trước
 */
export interface AnswerWrite {
  values: AnswerValues;
  overwrite: Record<keyof AnswerValues, boolean>;
}

export function answerWrite(input: AnswerInput): AnswerWrite {
  return {
    values: mergeAnswer(null, input),
    overwrite: {
      selectedOptionId: input.selectedOptionId !== undefined,
      textAnswer: input.textAnswer !== undefined,
      isFlagged: input.isFlagged !== undefined,
    },
  };
}
