import { useSearchParams } from 'react-router';
import type { DashboardGranularity } from '@/api/generated';
import {
  DASHBOARD_RANGES,
  DEFAULT_RANGE,
  defaultGranularity,
  GRANULARITIES,
  rangeToArg,
  type DashboardRange,
} from '../dashboard-meta';

const RANGE_KEYS = DASHBOARD_RANGES.map((item) => item.key);
const GRANULARITY_KEYS = GRANULARITIES.map((item) => item.value);

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

/**
 * Kỳ xem và cách gom biểu đồ nằm trên URL (?range=7d&by=week): tải lại trang hay gửi link vẫn
 * đúng. Giá trị mặc định không ghi lên URL, giá trị lạ bị bỏ qua
 */
export function useDashboardFilters() {
  const [params, setParams] = useSearchParams();
  const range = oneOf(params.get('range'), RANGE_KEYS) ?? DEFAULT_RANGE;
  const by = oneOf(params.get('by'), GRANULARITY_KEYS) ?? defaultGranularity(range);

  const write = (nextRange: DashboardRange, nextBy: DashboardGranularity) => {
    const search = new URLSearchParams();
    if (nextRange !== DEFAULT_RANGE) search.set('range', nextRange);
    if (nextBy !== defaultGranularity(nextRange)) search.set('by', nextBy);
    setParams(search, { replace: true });
  };

  return {
    range,
    by,
    /** Đổi kỳ thì cách gom về mặc định của kỳ đó */
    setRange: (next: DashboardRange) => write(next, defaultGranularity(next)),
    setBy: (next: DashboardGranularity) => write(range, next),
    arg: rangeToArg(range),
  };
}
