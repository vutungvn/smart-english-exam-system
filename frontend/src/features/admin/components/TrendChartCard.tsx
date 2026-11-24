import { useId, useState } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toApiError } from '@/api/errors';
import {
  useGetTrendsQuery,
  type DashboardGranularity,
  type DashboardTrendPoint,
  type GetOverviewApiArg,
} from '@/api/generated';
import { SegmentedControl } from '@/features/question-bank/components/FilterControls';
import { cn } from '@/lib/utils';
import {
  bucketLabel,
  formatBucket,
  formatNumber,
  GRANULARITIES,
  TREND_METRICS,
  type TrendMetric,
} from '../dashboard-meta';

interface TrendChartCardProps {
  arg: Required<GetOverviewApiArg>;
  by: DashboardGranularity;
  onByChange: (by: DashboardGranularity) => void;
  className?: string;
}

/**
 * Biểu đồ xu hướng theo ngày/tuần. Mỗi lần vẽ một chỉ số (một trục, không trộn các thang khác
 * nhau), chọn chỉ số và cách gom ở đầu thẻ
 */
export function TrendChartCard({ arg, by, onByChange, className }: TrendChartCardProps) {
  const [metric, setMetric] = useState<TrendMetric>('attempts');
  const { data, error, isLoading, isFetching, refetch } = useGetTrendsQuery({
    ...arg,
    granularity: by,
  });
  const points = data?.data.points ?? [];
  const meta = TREND_METRICS.find((item) => item.value === metric) ?? TREND_METRICS[0];
  const total = points.reduce((sum, point) => sum + point[metric], 0);

  return (
    <section
      aria-labelledby="trend-title"
      className={cn(
        'flex flex-col rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="trend-title" className="text-lg font-bold text-foreground">
            Xu hướng hoạt động
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {meta.label} theo {by === 'day' ? 'ngày' : 'tuần'}
            {data && ` · tổng ${formatNumber(total)} ${meta.unit} trong kỳ`}
          </p>
        </div>
        <SegmentedControl
          label="Gom theo"
          value={by}
          onChange={(value) => value && onByChange(value)}
          options={GRANULARITIES}
          className="flex w-32"
        />
      </div>

      <SegmentedControl
        label="Chỉ số"
        value={metric}
        onChange={(value) => value && setMetric(value)}
        options={TREND_METRICS.map(({ value, label }) => ({ value, label }))}
        className="mt-4 grid grid-cols-2 sm:flex"
      />

      {isLoading ? (
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-slate-100 sm:h-72" />
      ) : error && !data ? (
        <div className="mt-4 flex h-64 flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 px-6 text-center text-sm text-muted-foreground sm:h-72">
          {toApiError(error).message}
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-semibold text-primary hover:text-brand"
          >
            Thử lại
          </button>
        </div>
      ) : total === 0 ? (
        <div className="mt-4 flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 text-center sm:h-72">
          <LineChartIcon className="size-8 text-subtle" />
          <p className="font-semibold text-foreground">Chưa có {meta.unit} trong kỳ này</p>
          <p className="text-sm text-muted-foreground">Chọn chỉ số khác hoặc kỳ dài hơn.</p>
        </div>
      ) : (
        <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <TrendPlot points={points} metric={metric} by={by} />
        </div>
      )}
    </section>
  );
}

function TrendPlot({
  points,
  metric,
  by,
}: {
  points: DashboardTrendPoint[];
  metric: TrendMetric;
  by: DashboardGranularity;
}) {
  const gradientId = useId(); // id riêng cho <linearGradient> khi trang có nhiều biểu đồ
  const meta = TREND_METRICS.find((item) => item.value === metric) ?? TREND_METRICS[0];
  const peak = points.reduce((best, point) => (point[metric] > best[metric] ? point : best));

  return (
    <>
      <div
        role="img"
        aria-label={`Biểu đồ ${meta.label.toLowerCase()} qua ${points.length} mốc, cao nhất ${peak[metric]} vào ${bucketLabel(peak.bucket, by)}`}
        className="mt-4 h-64 sm:h-72"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
              tickMargin={10}
              minTickGap={20}
              tickFormatter={formatBucket}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
              tickFormatter={(value: number) => formatNumber(value)}
              width={44}
            />
            <Tooltip
              content={({ active, payload }) => (
                <TrendTooltip
                  active={active}
                  point={payload?.[0]?.payload as DashboardTrendPoint | undefined}
                  metric={metric}
                  by={by}
                />
              )}
              cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.3 }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="var(--primary)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              // Nhiều mốc (90 ngày) thì bỏ chấm cho đỡ rối, vẫn có chấm khi rê chuột
              dot={points.length <= 31 ? { r: 3, fill: '#fff', stroke: 'var(--primary)' } : false}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bảng dữ liệu cho trình đọc màn hình (biểu đồ chỉ là hình) */}
      {/* Bọc bằng div: thẻ <table> bỏ qua width 1px của sr-only nên vẫn chiếm chỗ, làm trang tràn ngang */}
      <div className="sr-only">
        <table>
          <caption>{meta.label} theo từng mốc</caption>
          <thead>
            <tr>
              <th>{by === 'day' ? 'Ngày' : 'Tuần'}</th>
              <th>{meta.label}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.bucket}>
                <td>{bucketLabel(point.bucket, by)}</td>
                <td>{point[metric]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TrendTooltip({
  active,
  point,
  metric,
  by,
}: {
  active?: boolean;
  point?: DashboardTrendPoint;
  metric: TrendMetric;
  by: DashboardGranularity;
}) {
  if (!active || !point) return null;
  const meta = TREND_METRICS.find((item) => item.value === metric) ?? TREND_METRICS[0];
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg shadow-slate-900/10">
      <p className="text-muted-foreground">{bucketLabel(point.bucket, by)}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
        {formatNumber(point[metric])} {meta.unit}
      </p>
    </div>
  );
}
