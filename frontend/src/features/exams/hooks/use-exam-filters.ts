import { useSearchParams } from 'react-router';
import type { ExamStatus, ListExamsApiArg, ScoringScale } from '@/api/generated';
import { EXAM_STATUSES, SCALES } from '../exam-meta';

export interface ExamFilters {
  status?: ExamStatus;
  scoringScale?: ScoringScale;
  q?: string;
  page: number;
  limit: number;
}

export const EXAM_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_LIMIT = 10;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

/** Bộ lọc nằm trên URL (?status=DRAFT&page=2): tải lại trang, bấm Back vẫn giữ đúng */
export function useExamFilters() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page'));
  const filters: ExamFilters = {
    status: oneOf(params.get('status'), EXAM_STATUSES),
    scoringScale: oneOf(params.get('type'), SCALES),
    q: params.get('q') ?? undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: oneOf(params.get('limit'), EXAM_PAGE_SIZES.map(String))
      ? Number(params.get('limit'))
      : DEFAULT_LIMIT,
  };

  /** Đổi bộ lọc thì về trang 1; giá trị mặc định không ghi lên URL */
  const update = (patch: Partial<ExamFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const search = new URLSearchParams();
    if (next.status) search.set('status', next.status);
    if (next.scoringScale) search.set('type', next.scoringScale);
    if (next.q) search.set('q', next.q);
    if (next.page > 1) search.set('page', String(next.page));
    if (next.limit !== DEFAULT_LIMIT) search.set('limit', String(next.limit));
    setParams(search, { replace: true });
  };

  const hasFilters = Boolean(filters.status || filters.scoringScale || filters.q);
  return { filters, update, hasFilters, clear: () => setParams({}, { replace: true }) };
}

export function toExamListArg(filters: ExamFilters): ListExamsApiArg {
  return {
    status: filters.status,
    scoringScale: filters.scoringScale,
    q: filters.q || undefined,
    page: filters.page,
    limit: filters.limit,
  };
}
