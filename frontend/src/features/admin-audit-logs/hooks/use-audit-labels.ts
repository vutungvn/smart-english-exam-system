import { useGetAuditLogFiltersQuery } from '@/api/generated';

/**
 * Nhãn tiếng Việt của hành động, đối tượng lấy từ GET /admin/audit-logs/filters (backend là nguồn
 * chuẩn, audit-labels.ts). Nhiều component cùng gọi chỉ tạo một request nhờ cache RTK Query.
 * Đang tải hoặc mã chưa có nhãn thì hiện chính mã đó.
 */
export function useAuditLabels() {
  const { data, isLoading } = useGetAuditLogFiltersQuery();
  const options = data?.data;

  const actions = new Map(options?.actions.map((item) => [item.value, item.label]));
  const entities = new Map(options?.entities.map((item) => [item.value, item.label]));

  return {
    options: options ?? { actions: [], entities: [] },
    loading: isLoading,
    actionLabel: (action: string) => actions.get(action) ?? action,
    entityLabel: (entity: string) => entities.get(entity) ?? entity,
  };
}
