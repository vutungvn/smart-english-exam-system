import { useSearchParams } from 'react-router';
import type { ExportAuditLogsDto, ListAuditLogsApiArg } from '@/api/generated';
import { SORT_OPTIONS, todayVn, type AuditExportFormat, type AuditLogSort } from '../labels';

export interface AuditLogFilters {
  /** Tìm người thực hiện theo họ tên, email */
  q?: string;
  action?: string;
  entity?: string;
  /** Có khi mở từ trang chi tiết một đối tượng (ví dụ "Nhật ký" của một người dùng) */
  entityId?: string;
  /** yyyy-MM-dd theo giờ Việt Nam, tính cả ngày đó */
  from?: string;
  to?: string;
  sort: AuditLogSort;
  page: number;
  limit: number;
}

export const PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_LIMIT = 20;
const DEFAULT_SORT: AuditLogSort = 'createdAt:desc';
const SORTS = SORT_OPTIONS.map((option) => option.value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Khoảng thời gian chọn nhanh: số ngày tính cả hôm nay */
export const QUICK_RANGES = [
  { key: 'today', label: 'Hôm nay', days: 1 },
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
] as const;
export type QuickRange = (typeof QUICK_RANGES)[number]['key'];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

function matching(value: string | null, pattern: RegExp): string | undefined {
  return value && pattern.test(value) ? value : undefined;
}

function positiveInt(value: string | null): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/**
 * Bộ lọc nằm trên URL (?action=user.lock&from=2026-11-01): tải lại trang, bấm Back hay gửi link
 * vẫn đúng bộ lọc. Giá trị lạ trên URL bị bỏ qua
 */
export function useAuditLogFilters() {
  const [params, setParams] = useSearchParams();

  const filters: AuditLogFilters = {
    q: params.get('q') ?? undefined,
    action: params.get('action') ?? undefined,
    entity: params.get('entity') ?? undefined,
    entityId: matching(params.get('entityId'), UUID),
    from: matching(params.get('from'), DATE),
    to: matching(params.get('to'), DATE),
    sort: oneOf(params.get('sort'), SORTS) ?? DEFAULT_SORT,
    page: positiveInt(params.get('page')) ?? 1,
    limit: oneOf(params.get('limit'), PAGE_SIZES.map(String))
      ? Number(params.get('limit'))
      : DEFAULT_LIMIT,
  };

  /** Đổi bộ lọc thì về trang 1; giá trị rỗng/mặc định thì xóa khỏi URL cho gọn */
  const update = (patch: Partial<AuditLogFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const search = new URLSearchParams();
    for (const key of ['q', 'action', 'entity', 'entityId', 'from', 'to'] as const) {
      const value = next[key];
      if (value) search.set(key, value);
    }
    if (next.sort !== DEFAULT_SORT) search.set('sort', next.sort);
    if (next.page > 1) search.set('page', String(next.page));
    if (next.limit !== DEFAULT_LIMIT) search.set('limit', String(next.limit));
    setParams(search, { replace: true });
  };

  const setQuickRange = (key: QuickRange | undefined) => {
    const range = QUICK_RANGES.find((item) => item.key === key);
    update(
      range
        ? { from: todayVn(-(range.days - 1)), to: todayVn() }
        : { from: undefined, to: undefined },
    );
  };

  // Khoảng đang chọn trùng một mốc nhanh thì sáng nút đó
  const quickRange = QUICK_RANGES.find(
    (item) => filters.from === todayVn(-(item.days - 1)) && filters.to === todayVn(),
  )?.key;

  const hasFilters = Boolean(
    filters.q || filters.action || filters.entity || filters.entityId || filters.from || filters.to,
  );

  return {
    filters,
    update,
    quickRange,
    setQuickRange,
    hasFilters,
    clear: () =>
      update({
        q: undefined,
        action: undefined,
        entity: undefined,
        entityId: undefined,
        from: undefined,
        to: undefined,
      }),
  };
}

/**
 * Điều kiện lọc gửi API: ngày yyyy-MM-dd đổi thành mốc đầu/cuối ngày theo giờ Việt Nam, để
 * "Đến ngày 22/11" lấy cả bản ghi lúc 23:59 ngày 22/11. Bỏ trường rỗng (RTK Query cache theo tham số)
 */
function toFilterArg(filters: AuditLogFilters) {
  return {
    q: filters.q || undefined,
    action: filters.action,
    entity: filters.entity,
    entityId: filters.entityId,
    from: filters.from ? `${filters.from}T00:00:00.000+07:00` : undefined,
    to: filters.to ? `${filters.to}T23:59:59.999+07:00` : undefined,
  };
}

export function toListArg(filters: AuditLogFilters): ListAuditLogsApiArg {
  return {
    ...toFilterArg(filters),
    sort: filters.sort,
    page: filters.page,
    limit: filters.limit,
  };
}

/** Xuất đúng bộ lọc đang xem (không phân trang, backend luôn xếp mới nhất trước) */
export function toExportArg(
  filters: AuditLogFilters,
  format: AuditExportFormat,
): ExportAuditLogsDto {
  return { ...toFilterArg(filters), format };
}
