import { RefreshCw } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useRefreshDashboardMutation } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/features/question-bank/components/FilterControls';
import { cn } from '@/lib/utils';
import { DASHBOARD_RANGES, formatGeneratedAt, type DashboardRange } from '../dashboard-meta';

interface DashboardToolbarProps {
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  /** Thời điểm server tổng hợp số liệu (có thể lấy từ cache 5 phút) */
  generatedAt?: string;
}

/** Chọn kỳ xem, thời điểm cập nhật và nút Làm mới (xóa cache số liệu ở server) */
export function DashboardToolbar({ range, onRangeChange, generatedAt }: DashboardToolbarProps) {
  const [refresh, { isLoading, error }] = useRefreshDashboardMutation();

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SegmentedControl
          label="Kỳ xem"
          value={range}
          onChange={(value) => value && onRangeChange(value)}
          options={DASHBOARD_RANGES.map((item) => ({ value: item.key, label: item.label }))}
          className="flex sm:w-96"
        />
        <Button
          variant="outline"
          size="lg"
          disabled={isLoading}
          // Mutation có invalidatesTags 'Admin Dashboard': số liệu và biểu đồ tự tải lại
          onClick={() => void refresh()}
          className="h-10 rounded-xl px-3.5 font-semibold"
        >
          <RefreshCw className={cn(isLoading && 'animate-spin')} />
          Làm mới
        </Button>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {error
          ? `Làm mới thất bại: ${toApiError(error).message}`
          : generatedAt && `Cập nhật lúc ${formatGeneratedAt(generatedAt)}`}
      </p>
    </div>
  );
}
