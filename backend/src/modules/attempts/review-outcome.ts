import { QuestionType } from '../../generated/prisma/enums.js';
import { ReviewOutcome, type ReviewCounts } from './attempts.types.js';

export interface OutcomeAnswer {
  selectedOptionId: string | null;
  textAnswer: string | null;
  /** Kết quả ghi lúc nộp bài (null: bỏ trống, câu mở, hoặc bài nộp trước khi có cột này) */
  isCorrect: boolean | null;
}

/**
 * Kết quả một câu ở màn xem lại. Câu trắc nghiệm theo kết quả đã chấm lúc nộp (khớp điểm số), chỉ
 * khi chưa có thì so với đáp án đúng hiện tại. Câu Speaking/Writing chưa có điểm AI: đã trả lời là
 * PENDING, chưa trả lời là SKIPPED (Speaking chưa ghi âm được nên hiện luôn là SKIPPED).
 */
export function reviewOutcome(
  type: QuestionType,
  answer: OutcomeAnswer | undefined,
  correctOptionId: string | null,
): ReviewOutcome {
  if (type === QuestionType.SINGLE_CHOICE) {
    if (!answer?.selectedOptionId) return ReviewOutcome.SKIPPED;
    const correct = answer.isCorrect ?? answer.selectedOptionId === correctOptionId;
    return correct ? ReviewOutcome.CORRECT : ReviewOutcome.WRONG;
  }
  return answer?.textAnswer?.trim() ? ReviewOutcome.PENDING : ReviewOutcome.SKIPPED;
}

export function emptyCounts(): ReviewCounts {
  return { correct: 0, wrong: 0, skipped: 0, pending: 0 };
}

const COUNT_KEY: Record<ReviewOutcome, keyof ReviewCounts> = {
  CORRECT: 'correct',
  WRONG: 'wrong',
  SKIPPED: 'skipped',
  PENDING: 'pending',
};

export function addOutcome(counts: ReviewCounts, outcome: ReviewOutcome): void {
  counts[COUNT_KEY[outcome]]++;
}

/**
 * Thời gian làm bài (giây). Bài tự nộp có thể được chấm trễ hơn giờ hết hạn (job quét định kỳ, hoặc
 * học viên mở lại bài sau nhiều giờ) nên tính tới mốc sớm hơn giữa lúc nộp và lúc hết giờ
 */
export function durationOf(startedAt: Date, submittedAt: Date, expiresAt: Date | null): number {
  const end = expiresAt && expiresAt < submittedAt ? expiresAt : submittedAt;
  return Math.max(0, Math.round((end.getTime() - startedAt.getTime()) / 1000));
}
