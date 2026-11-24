import { useSearchParams } from 'react-router';
import type { ListAdminUsersApiArg, ManagedRole, UserStatus } from '@/api/generated';
import { MANAGED_ROLES, SORT_OPTIONS, USER_STATUSES, type AdminUserSort } from '../labels';

export interface UserFilters {
  q?: string;
  role?: ManagedRole;
  status?: UserStatus;
  sort: AdminUserSort;
  page: number;
  limit: number;
}

export const PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT: AdminUserSort = 'createdAt:desc';
const SORTS = SORT_OPTIONS.map((option) => option.value);

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

function positiveInt(value: string | null): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/**
 * Bộ lọc nằm trên URL (?role=TEACHER&status=LOCKED&page=2): tải lại trang, bấm Back hay gửi link
 * vẫn đúng bộ lọc. Giá trị lạ trên URL bị bỏ qua thay vì gửi lên API
 */
export function useUserFilters() {
  const [params, setParams] = useSearchParams();

  const filters: UserFilters = {
    q: params.get('q') ?? undefined,
    role: oneOf(params.get('role'), MANAGED_ROLES),
    status: oneOf(params.get('status'), USER_STATUSES),
    sort: oneOf(params.get('sort'), SORTS) ?? DEFAULT_SORT,
    page: positiveInt(params.get('page')) ?? 1,
    limit: oneOf(params.get('limit'), PAGE_SIZES.map(String))
      ? Number(params.get('limit'))
      : DEFAULT_LIMIT,
  };

  /** Đổi bộ lọc thì về trang 1; giá trị rỗng/mặc định thì xóa khỏi URL cho gọn */
  const update = (patch: Partial<UserFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const search = new URLSearchParams();
    if (next.q) search.set('q', next.q);
    if (next.role) search.set('role', next.role);
    if (next.status) search.set('status', next.status);
    if (next.sort !== DEFAULT_SORT) search.set('sort', next.sort);
    if (next.page > 1) search.set('page', String(next.page));
    if (next.limit !== DEFAULT_LIMIT) search.set('limit', String(next.limit));
    setParams(search, { replace: true });
  };

  const hasFilters = Boolean(filters.q || filters.role || filters.status);

  return { filters, update, hasFilters, clear: () => setParams({}, { replace: true }) };
}

/** Tham số gửi API: bỏ các trường undefined (RTK Query cache theo tham số) */
export function toListArg(filters: UserFilters): ListAdminUsersApiArg {
  return {
    q: filters.q || undefined,
    role: filters.role,
    status: filters.status,
    sort: filters.sort,
    page: filters.page,
    limit: filters.limit,
  };
}
