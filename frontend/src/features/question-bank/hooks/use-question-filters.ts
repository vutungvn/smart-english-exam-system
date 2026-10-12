import { useSearchParams } from 'react-router';
import type { Difficulty, ListQuestionsApiArg, QuestionStatus, Skill } from '@/api/generated';
import { SKILLS } from '../toeic';

export type QuestionSort = NonNullable<ListQuestionsApiArg['sort']>;

export interface QuestionFilters {
  skill?: Skill;
  part?: number;
  topicId?: string;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  q?: string;
  mine: boolean;
  sort: QuestionSort;
  page: number;
  limit: number;
}

export const PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT: QuestionSort = 'createdAt:desc';
const SORTS: QuestionSort[] = ['createdAt:desc', 'createdAt:asc', 'updatedAt:desc', 'part:asc'];
const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const STATUSES: QuestionStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

function positiveInt(value: string | null): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/**
 * Bộ lọc nằm trên URL (?skill=READING&part=5&page=2): tải lại trang, bấm Back hay gửi link
 * cho người khác vẫn đúng bộ lọc. Giá trị lạ trên URL bị bỏ qua thay vì gửi lên API.
 */
export function useQuestionFilters() {
  const [params, setParams] = useSearchParams();

  const skill = oneOf(params.get('skill'), SKILLS);
  const filters: QuestionFilters = {
    skill,
    // Part và chủ đề chỉ có nghĩa khi đã chọn kỹ năng (Part đánh số riêng theo kỹ năng)
    part: skill ? positiveInt(params.get('part')) : undefined,
    topicId: skill ? (params.get('topicId') ?? undefined) : undefined,
    difficulty: oneOf(params.get('difficulty'), DIFFICULTIES),
    status: oneOf(params.get('status'), STATUSES),
    q: params.get('q') ?? undefined,
    mine: params.get('mine') === 'true',
    sort: oneOf(params.get('sort'), SORTS) ?? DEFAULT_SORT,
    page: positiveInt(params.get('page')) ?? 1,
    limit: oneOf(params.get('limit'), PAGE_SIZES.map(String))
      ? Number(params.get('limit'))
      : DEFAULT_LIMIT,
  };

  /** Đổi bộ lọc thì về trang 1; giá trị rỗng/mặc định thì xóa khỏi URL cho gọn */
  const update = (patch: Partial<QuestionFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    // Đổi kỹ năng thì Part và chủ đề cũ không còn đúng
    if ('skill' in patch && patch.skill !== filters.skill) {
      next.part = undefined;
      next.topicId = undefined;
    }
    if ('part' in patch && patch.part !== filters.part) next.topicId = undefined;

    const search = new URLSearchParams();
    if (next.skill) search.set('skill', next.skill);
    if (next.part) search.set('part', String(next.part));
    if (next.topicId) search.set('topicId', next.topicId);
    if (next.difficulty) search.set('difficulty', next.difficulty);
    if (next.status) search.set('status', next.status);
    if (next.q) search.set('q', next.q);
    if (next.mine) search.set('mine', 'true');
    if (next.sort !== DEFAULT_SORT) search.set('sort', next.sort);
    if (next.page > 1) search.set('page', String(next.page));
    if (next.limit !== DEFAULT_LIMIT) search.set('limit', String(next.limit));
    setParams(search, { replace: true });
  };

  const hasFilters = Boolean(
    filters.skill || filters.difficulty || filters.status || filters.q || filters.mine,
  );

  return { filters, update, hasFilters, clear: () => setParams({}, { replace: true }) };
}

/** Tham số gửi API: bỏ các trường undefined (RTK Query cache theo tham số) */
export function toListArg(filters: QuestionFilters): ListQuestionsApiArg {
  return {
    skill: filters.skill,
    part: filters.part,
    topicId: filters.topicId,
    difficulty: filters.difficulty,
    status: filters.status,
    q: filters.q || undefined,
    mine: filters.mine || undefined,
    sort: filters.sort,
    page: filters.page,
    limit: filters.limit,
  };
}
