import { useSearchParams } from 'react-router';
import type { AttemptMode, ListAttemptHistoryApiArg } from '@/api/generated';

export type HistorySort = NonNullable<ListAttemptHistoryApiArg['sort']>;

export interface HistoryFilters {
  mode?: AttemptMode;
  examId?: string;
  sort: HistorySort;
  page: number;
  limit: number;
}

export const HISTORY_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_LIMIT = 10;
const MODES: readonly AttemptMode[] = ['FULL', 'PART'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Bộ lọc lịch sử làm bài trên URL (?mode=PART&examId=…&page=2): tải lại trang, bấm Back vẫn giữ */
export function useHistoryFilters() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page'));
  const examId = params.get('examId') ?? '';
  const filters: HistoryFilters = {
    mode: MODES.find((mode) => mode === params.get('mode')),
    // examId sai định dạng (sửa tay trên URL) thì bỏ qua thay vì để server báo lỗi 400
    examId: UUID.test(examId) ? examId : undefined,
    sort: params.get('sort') === 'submittedAt:asc' ? 'submittedAt:asc' : 'submittedAt:desc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: HISTORY_PAGE_SIZES.map(String).includes(params.get('limit') ?? '')
      ? Number(params.get('limit'))
      : DEFAULT_LIMIT,
  };

  /** Đổi bộ lọc thì về trang 1; giá trị mặc định không ghi lên URL */
  const update = (patch: Partial<HistoryFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const search = new URLSearchParams();
    if (next.mode) search.set('mode', next.mode);
    if (next.examId) search.set('examId', next.examId);
    if (next.sort !== 'submittedAt:desc') search.set('sort', next.sort);
    if (next.page > 1) search.set('page', String(next.page));
    if (next.limit !== DEFAULT_LIMIT) search.set('limit', String(next.limit));
    setParams(search, { replace: true });
  };

  const hasFilters = Boolean(filters.mode || filters.examId);
  return { filters, update, hasFilters, clear: () => setParams({}, { replace: true }) };
}
