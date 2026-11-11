import { AssessmentStatus, QuestionType } from '../../generated/prisma/enums.js';
import { ReviewOutcome, type ReviewCounts } from './attempts.types.js';

export interface OutcomeAnswer {
  selectedOptionId: string | null;
  textAnswer: string | null;
  /** Kết quả ghi lúc nộp bài (null: bỏ trống, câu mở, hoặc bài nộp trước khi có cột này) */
  isCorrect: boolean | null;
  /** Bài nói Speaking trong kho tệp */
  audioKey?: string | null;
}

const ASSESSMENT_OUTCOME: Record<AssessmentStatus, ReviewOutcome> = {
  PENDING: ReviewOutcome.PENDING,
  DONE: ReviewOutcome.SCORED,
  FAILED: ReviewOutcome.FAILED,
};

/**
 * Kết quả một câu ở màn xem lại. Câu trắc nghiệm theo kết quả đã chấm lúc nộp (khớp điểm số), chỉ
 * khi chưa có thì so với đáp án đúng hiện tại. Câu Speaking/Writing đã trả lời (đã viết, đã có bài
 * nói) theo phiếu chấm: PENDING, SCORED, FAILED (chưa có phiếu thì PENDING); chưa trả lời là SKIPPED.
 */
export function reviewOutcome(
  type: QuestionType,
  answer: OutcomeAnswer | undefined,
  correctOptionId: string | null,
  assessment?: AssessmentStatus | null,
): ReviewOutcome {
  if (type === QuestionType.SINGLE_CHOICE) {
    if (!answer?.selectedOptionId) return ReviewOutcome.SKIPPED;
    const correct = answer.isCorrect ?? answer.selectedOptionId === correctOptionId;
    return correct ? ReviewOutcome.CORRECT : ReviewOutcome.WRONG;
  }
  if (!answer?.textAnswer?.trim() && !answer?.audioKey) return ReviewOutcome.SKIPPED;
  return assessment ? ASSESSMENT_OUTCOME[assessment] : ReviewOutcome.PENDING;
}

export function emptyCounts(): ReviewCounts {
  return { correct: 0, wrong: 0, skipped: 0, pending: 0, scored: 0, failed: 0 };
}

const COUNT_KEY: Record<ReviewOutcome, keyof ReviewCounts> = {
  CORRECT: 'correct',
  WRONG: 'wrong',
  SKIPPED: 'skipped',
  PENDING: 'pending',
  SCORED: 'scored',
  FAILED: 'failed',
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
