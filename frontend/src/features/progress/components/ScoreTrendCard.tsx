import { useId, useState } from 'react';
import { Link } from 'react-router';
import { LineChart as LineChartIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toApiError } from '@/api/errors';
import { useGetScoreTrendQuery, type ScoreTrendPoint } from '@/api/generated';
import { formatDateTime, PRACTICE_PATH } from '@/features/practice/practice-meta';
import { cn } from '@/lib/utils';
import {
  formatPercent,
  formatShortDate,
  METRIC_LABEL,
  metricValue,
  modeLabel,
  RANGE_LABEL,
  type ProgressRange,
  type TrendMetric,
} from '../progress-meta';

interface ScoreTrendCardProps {
  title: string;
  description: string;
  range: ProgressRange;
  /** Có thì hiện nút chọn khoảng thời gian trong thẻ (Trang chủ); trang Tiến độ chọn ở đầu trang */
  ranges?: readonly ProgressRange[];
  onRangeChange?: (range: ProgressRange) => void;
  /** true: biểu đồ giãn theo chiều cao thẻ (thẻ bị lưới kéo cao, như Trang chủ) */
  fill?: boolean;
  className?: string;
}

interface ChartRow {
  index: number;
  value: number;
  point: ScoreTrendPoint;
}

/**
 * Điểm các bài đã nộp theo thời gian. Hai thước đo, mỗi lần vẽ một đường (không vẽ chung hai thang):
 * tỉ lệ câu trắc nghiệm đúng (mọi bài) hoặc điểm TOEIC LR (chỉ bài làm cả đề TOEIC LR, có đường mục tiêu).
 */
export function ScoreTrendCard({
  title,
  description,
  range,
  ranges,
  onRangeChange,
  fill = false,
  className,
}: ScoreTrendCardProps) {
  const { data, error, isLoading, refetch } = useGetScoreTrendQuery(range);
  const points = data?.data.points ?? [];
  const hasToeic = points.some((point) => metricValue(point, 'toeic') !== null);
  const [picked, setPicked] = useState<TrendMetric>('toeic');
  // Chưa có bài TOEIC LR nào trong khoảng thì chỉ còn tỉ lệ đúng
  const metric: TrendMetric = hasToeic ? picked : 'percent';

  return (
    <section
      className={cn(
        'flex flex-col rounded-3xl border border-border bg-white p-6 shadow-2xs',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {ranges && onRangeChange && (
          <Toggle
            label="Khoảng thời gian"
            options={ranges.map((value) => ({ value, label: RANGE_LABEL[value] }))}
            value={range}
            onChange={onRangeChange}
          />
        )}
      </div>

      {hasToeic && (
        <Toggle
          className="mt-4 self-start"
          label="Thước đo"
          options={(['toeic', 'percent'] as const).map((value) => ({
            value,
            label: METRIC_LABEL[value],
          }))}
          value={metric}
          onChange={setPicked}
        />
      )}

      {isLoading ? (
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-slate-100 sm:h-72" />
      ) : error && !data ? (
        <div className="mt-4 flex h-64 flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 text-center text-sm text-muted-foreground sm:h-72">
          {toApiError(error).message}
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-semibold text-primary hover:text-brand"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <TrendPlot
          points={points}
          metric={metric}
          targetScore={data?.data.targetScore ?? null}
          range={range}
          fill={fill}
        />
      )}
    </section>
  );
}

function TrendPlot({
  points,
  metric,
  targetScore,
  range,
  fill,
}: {
  points: ScoreTrendPoint[];
  metric: TrendMetric;
  targetScore: number | null;
  range: ProgressRange;
  fill: boolean;
}) {
  const gradientId = useId(); // id duy nhất cho <linearGradient> khi trang có nhiều biểu đồ
  // Bài không có giá trị theo thước đo này (ví dụ bài luyện tập khi xem điểm TOEIC) thì bỏ qua
  const rows: ChartRow[] = points
    .flatMap((point) => {
      const value = metricValue(point, metric);
      return value === null ? [] : [{ value, point }];
    })
    .map((row, index) => ({ ...row, index }));

  if (rows.length === 0) {
    return (
      <div className="mt-4 flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 text-center sm:h-72">
        <LineChartIcon className="size-8 text-subtle" />
        <p className="font-semibold text-foreground">
          Chưa có bài nộp trong {RANGE_LABEL[range].toLowerCase()}
        </p>
        <p className="text-sm text-muted-foreground">Làm và nộp bài, điểm sẽ hiện trên biểu đồ.</p>
        <Link
          to={PRACTICE_PATH}
          className="mt-1 text-sm font-semibold text-primary hover:text-brand"
        >
          Luyện đề ngay
        </Link>
      </div>
    );
  }

  const toeic = metric === 'toeic';
  const format = (value: number) => (toeic ? `${value}` : formatPercent(value));
  const first = rows[0].value;
  const last = rows.at(-1)!.value;
  const showTarget = toeic && targetScore !== null;

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
        <span className="flex items-center gap-2 text-foreground">
          <span className="size-2.5 rounded-full bg-primary" />
          {METRIC_LABEL[metric]} · gần nhất {format(last)}
        </span>
        {showTarget && (
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="w-4 border-t-2 border-dashed border-destructive" />
            Mục tiêu {targetScore}
          </span>
        )}
      </div>

      <div
        role="img"
        aria-label={`Biểu đồ ${METRIC_LABEL[metric].toLowerCase()} qua ${rows.length} bài, từ ${format(first)} đến ${format(last)}`}
        // Cao cố định; fill: giãn theo thẻ nhưng không thấp hơn 256px (không dùng flex-1 khi thẻ
        // không bị kéo cao vì flex-basis 0 sẽ đè height, khung co về 0px)
        className={cn('mt-3', fill ? 'min-h-64 flex-1' : 'h-64 sm:h-72')}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="index"
              type="category"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
              tickMargin={10}
              padding={{ left: 16, right: 16 }}
              minTickGap={16}
              tickFormatter={(index: number) =>
                formatShortDate(rows[index]?.point.submittedAt ?? '')
              }
            />
            <YAxis
              domain={toeic ? [0, 990] : [0, 100]}
              ticks={toeic ? [0, 250, 500, 750, 990] : [0, 25, 50, 75, 100]}
              tickFormatter={(value: number) => (toeic ? `${value}` : `${value}%`)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
              width={44}
            />
            <Tooltip
              content={({ active, payload }) => (
                <TrendTooltip
                  active={active}
                  row={payload?.[0]?.payload as ChartRow | undefined}
                  metric={metric}
                />
              )}
              cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.3 }}
            />
            {showTarget && (
              <ReferenceLine y={targetScore} stroke="var(--destructive)" strokeDasharray="6 4" />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ r: 4, fill: '#fff', stroke: 'var(--primary)', strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bảng dữ liệu cho trình đọc màn hình (biểu đồ chỉ là hình) */}
      {/* Bọc bằng div: thẻ <table> bỏ qua width 1px của sr-only nên vẫn chiếm chỗ, làm trang tràn ngang */}
      <div className="sr-only">
        <table>
          <caption>{METRIC_LABEL[metric]} theo từng bài</caption>
          <thead>
            <tr>
              <th>Ngày nộp</th>
              <th>Đề thi</th>
              <th>{METRIC_LABEL[metric]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.point.attemptId}>
                <td>{formatDateTime(row.point.submittedAt)}</td>
                <td>
                  {row.point.exam.title} ({modeLabel(row.point)})
                </td>
                <td>{format(row.value)}</td>
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
  row,
  metric,
}: {
  active?: boolean;
  row?: ChartRow;
  metric: TrendMetric;
}) {
  if (!active || !row) return null;
  const { point } = row;
  return (
    <div className="max-w-64 rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg shadow-slate-900/10">
      <p className="font-semibold text-foreground">{point.exam.title}</p>
      <p className="text-muted-foreground">
        {modeLabel(point)} · {formatDateTime(point.submittedAt)}
      </p>
      <p className="mt-1.5 text-sm font-bold text-foreground tabular-nums">
        {metric === 'toeic' ? `${row.value} / 990` : formatPercent(row.value)}
      </p>
      <p className="text-muted-foreground">
        {point.correctCount}/{point.choiceTotal} câu trắc nghiệm đúng
        {point.scaledScore === null && ' · còn câu chờ AI chấm'}
      </p>
    </div>
  );
}

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex rounded-xl bg-background p-1', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            value === option.value
              ? 'bg-white text-brand shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
