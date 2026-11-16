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
  SCORED: {
    label: 'Đã chấm',
    badge: 'bg-sky-50 text-sky-700',
    cell: 'border-sky-500 bg-sky-500 text-white',
    number: 'bg-sky-500 text-white',
  },
  FAILED: {
    label: 'Chấm lỗi',
    badge: 'bg-rose-50 text-rose-700',
    cell: 'border-rose-400 bg-rose-50 text-rose-700',
    number: 'bg-rose-500 text-white',
  },
};

/** Câu đã có điểm AI: tô màu theo tỉ lệ điểm (cao xanh lá, trung bình xanh dương, thấp đỏ nhạt) */
const SCORE_CELL = {
  high: 'border-emerald-500 bg-emerald-500 text-white',
  mid: 'border-sky-500 bg-sky-500 text-white',
  low: 'border-rose-300 bg-rose-100 text-rose-800',
} as const;

export function scoreLevel(score: number, max: number): keyof typeof SCORE_CELL {
  const ratio = max > 0 ? score / max : 0;
  return ratio >= 0.75 ? 'high' : ratio >= 0.4 ? 'mid' : 'low';
}

/** Màu ô số câu ở bảng câu hỏi */
export function questionCell(question: ReviewQuestion): string {
  const assessment = question.assessment;
  if (question.outcome === 'SCORED' && assessment?.score != null) {
    return SCORE_CELL[scoreLevel(assessment.score, assessment.maxScore)];
  }
  return OUTCOME_META[question.outcome].cell;
}

export type ReviewFilter = 'ALL' | 'WRONG' | 'SKIPPED' | 'FLAGGED' | 'PENDING' | 'FAILED';

export const REVIEW_FILTERS: readonly { value: ReviewFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'WRONG', label: 'Sai' },
  { value: 'SKIPPED', label: 'Bỏ trống' },
  { value: 'FLAGGED', label: 'Đã đánh dấu' },
  { value: 'PENDING', label: 'Chờ chấm' },
  { value: 'FAILED', label: 'Chấm lỗi' },
];

export function matchesFilter(question: ReviewQuestion, filter: ReviewFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'FLAGGED') return question.isFlagged;
  return question.outcome === filter;
}

/** Bài có câu Speaking/Writing (chấm bằng AI) */
export function hasOpen(result: AttemptResult): boolean {
  return result.skillScores.some((skill) => skill.openCount > 0);
}

/** Bài có câu trắc nghiệm */
export function hasChoice(result: AttemptResult): boolean {
  return result.skillScores.some((skill) => skill.total > 0);
}

/** Điểm tối đa của thang TOEIC: LR 990; SW 200 mỗi kỹ năng có trong bài */
export function scaleMax(result: AttemptResult): number | null {
  if (result.scoring === 'TOEIC_990') return 990;
  if (result.scoring === 'TOEIC_SW') {
    return 200 * result.skillScores.filter((skill) => skill.openCount > 0).length;
  }
  return null;
}

/** "650 / 990", "150 / 200", "62.5%"; null khi còn câu chờ AI chấm */
export function formatScore(result: AttemptResult): string | null {
  if (result.scaledScore === null) return null;
  const max = scaleMax(result);
  return max !== null
    ? `${result.scaledScore} / ${max}`
    : `${Number(result.scaledScore.toFixed(2))}%`;
}

/** Nhãn của điểm: "Điểm TOEIC Writing", "Điểm TOEIC", "Tỉ lệ điểm đạt" */
export function scoreLabel(result: AttemptResult): string {
  if (result.scoring === 'TOEIC_990') return 'Điểm TOEIC Listening & Reading';
  if (result.scoring === 'TOEIC_SW') {
    const skills = result.skillScores
      .filter((skill) => skill.openCount > 0)
      .map((skill) => (skill.skill === 'SPEAKING' ? 'Speaking' : 'Writing'));
    return `Điểm TOEIC ${skills.join(' & ')}`;
  }
  return hasOpen(result) ? 'Tỉ lệ điểm đạt' : 'Tỉ lệ câu đúng';
}

/** Số câu trắc nghiệm đúng / tổng câu trắc nghiệm; bài chỉ có câu mở thì là điểm thô */
export function choiceSummary(result: AttemptResult): string {
  if (!hasChoice(result)) {
    const open = result.skillScores.filter((skill) => skill.openCount > 0);
    const raw = open.every((skill) => skill.openRaw !== null)
      ? open.reduce((sum, skill) => sum + (skill.openRaw ?? 0), 0)
      : null;
    const max = open.reduce((sum, skill) => sum + skill.openMax, 0);
    return raw === null ? 'Đang chấm bài' : `Điểm thô ${raw}/${max}`;
  }
  const total = result.correctCount + result.wrongCount + result.skippedCount;
  return `${result.correctCount}/${total} câu đúng (trắc nghiệm)`;
}

/** Bài đang chờ AI chấm: các trang kết quả hỏi lại server định kỳ */
export const GRADING_POLL_MS = 5000;

export function isGrading(result: AttemptResult | null | undefined): boolean {
  return !!result && result.status === 'SUBMITTED' && (result.grading?.pending ?? 0) > 0;
}
