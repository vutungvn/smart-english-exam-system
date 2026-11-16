import { useSearchParams } from 'react-router';
import type { ListQuestionGroupsApiArg, QuestionStatus, Skill } from '@/api/generated';
import { GROUP_SKILLS } from '../toeic';

export interface GroupFilters {
  skill?: Skill;
  part?: number;
  topicId?: string;
  status?: QuestionStatus;
  mine: boolean;
  page: number;
  limit: number;
}

/** Lưới 3 cột: số nhóm mỗi trang là bội số của 3 để hàng cuối không lẻ */
export const GROUP_PAGE_SIZES = [9, 18, 36] as const;
const DEFAULT_LIMIT = 9;
const STATUSES: QuestionStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

function positiveInt(value: string | null): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Bộ lọc nằm trên URL, cùng cách làm với trang Ngân hàng câu hỏi (use-question-filters) */
export function useGroupFilters() {
  const [params, setParams] = useSearchParams();

  const skill = oneOf(params.get('skill'), GROUP_SKILLS);
  const filters: GroupFilters = {
    skill,
    part: skill ? positiveInt(params.get('part')) : undefined,
    topicId: skill ? (params.get('topicId') ?? undefined) : undefined,
    status: oneOf(params.get('status'), STATUSES),
    mine: params.get('mine') === 'true',
    page: positiveInt(params.get('page')) ?? 1,
    limit: oneOf(params.get('limit'), GROUP_PAGE_SIZES.map(String))
      ? Number(params.get('limit'))
      : DEFAULT_LIMIT,
  };

  const update = (patch: Partial<GroupFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    if ('skill' in patch && patch.skill !== filters.skill) {
      next.part = undefined;
      next.topicId = undefined;
    }
    if ('part' in patch && patch.part !== filters.part) next.topicId = undefined;

    const search = new URLSearchParams();
    if (next.skill) search.set('skill', next.skill);
    if (next.part) search.set('part', String(next.part));
    if (next.topicId) search.set('topicId', next.topicId);
    if (next.status) search.set('status', next.status);
    if (next.mine) search.set('mine', 'true');
    if (next.page > 1) search.set('page', String(next.page));
    if (next.limit !== DEFAULT_LIMIT) search.set('limit', String(next.limit));
    setParams(search, { replace: true });
  };

  // "Chỉ nhóm của tôi" không tính là đang lọc: dùng để đếm số nhóm theo kỹ năng
  const hasFilters = Boolean(filters.skill || filters.status || filters.topicId);

  return { filters, update, hasFilters, clear: () => setParams({}, { replace: true }) };
}

export function toGroupListArg(filters: GroupFilters): ListQuestionGroupsApiArg {
  return {
    skill: filters.skill,
    part: filters.part,
    topicId: filters.topicId,
    status: filters.status,
    mine: filters.mine || undefined,
    page: filters.page,
    limit: filters.limit,
  };
}
