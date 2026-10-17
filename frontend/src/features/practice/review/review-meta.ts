import type { AttemptResult, ReviewOutcome, ReviewQuestion } from '@/api/generated';

/** Màu, nhãn của kết quả từng câu ở màn xem lại */
export const OUTCOME_META: Record<
  ReviewOutcome,
  { label: string; badge: string; cell: string; number: string }
> = {
  CORRECT: {
    label: 'Đúng',
    badge: 'bg-emerald-50 text-success',
    cell: 'border-emerald-500 bg-emerald-500 text-white',
    number: 'bg-emerald-500 text-white',
  },
  WRONG: {
    label: 'Sai',
    badge: 'bg-danger-soft text-destructive',
    cell: 'border-destructive bg-destructive text-white',
    number: 'bg-destructive text-white',
  },
  SKIPPED: {
    label: 'Bỏ trống',
    badge: 'bg-slate-100 text-slate-600',
    cell: 'border-border bg-white text-slate-600',
    number: 'bg-slate-200 text-slate-700',
  },
  PENDING: {
    label: 'Chờ AI chấm',
    badge: 'bg-amber-50 text-amber-700',
    cell: 'border-amber-400 bg-amber-100 text-amber-800',
    number: 'bg-amber-400 text-white',
  },
};

export type ReviewFilter = 'ALL' | 'WRONG' | 'SKIPPED' | 'FLAGGED' | 'PENDING';

export const REVIEW_FILTERS: readonly { value: ReviewFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'WRONG', label: 'Sai' },
  { value: 'SKIPPED', label: 'Bỏ trống' },
  { value: 'FLAGGED', label: 'Đã đánh dấu' },
  { value: 'PENDING', label: 'Chờ chấm' },
];

export function matchesFilter(question: ReviewQuestion, filter: ReviewFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'FLAGGED') return question.isFlagged;
  return question.outcome === filter;
}

/** "650 / 990", "62.5%"; null khi còn câu chờ AI chấm */
export function formatScore(result: AttemptResult): string | null {
  if (result.scaledScore === null) return null;
  return result.scoring === 'TOEIC_990'
    ? `${result.scaledScore} / 990`
    : `${Number(result.scaledScore.toFixed(2))}%`;
}

/** Số câu trắc nghiệm đúng / tổng câu trắc nghiệm */
export function choiceSummary(result: AttemptResult): string {
  const total = result.correctCount + result.wrongCount + result.skippedCount;
  return `${result.correctCount}/${total} câu đúng`;
}
