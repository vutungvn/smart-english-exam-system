import { useId, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { LR_PREDICTION, SCORE_HISTORY, type ScoreRange } from '../mock-data';

const RANGES: { value: ScoreRange; label: string }[] = [
  { value: '4w', label: '4 tuần' },
  { value: '3m', label: '3 tháng' },
];

const Y_TICKS = [400, 500, 600, 700, 800];

export function ScoreProgressChart() {
  const [range, setRange] = useState<ScoreRange>('4w');
  const gradientId = useId(); // id duy nhất cho <linearGradient> khi trang có nhiều biểu đồ
  const data = SCORE_HISTORY[range];
  const { score: current, target } = LR_PREDICTION;
  const first = data[0]?.score ?? current;

  return (
    <section className="flex flex-col rounded-3xl border border-border bg-white p-6 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tiến độ điểm số</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tổng điểm Nghe & Đọc qua các lần làm bài
          </p>
        </div>
        <div
          role="group"
          aria-label="Khoảng thời gian"
          className="flex rounded-xl bg-background p-1"
        >
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={range === item.value}
              onClick={() => setRange(item.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                range === item.value
                  ? 'bg-white text-brand shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
        <span className="flex items-center gap-2 text-brand">
          <span className="size-2.5 rounded-full bg-primary" />
          Tổng LR ({current})
        </span>
        <span className="flex items-center gap-2 text-destructive">
          <span className="w-4 border-t-2 border-dashed border-destructive" />
          Mục tiêu {target}
        </span>
      </div>

      <div
        role="img"
        aria-label={`Biểu đồ tổng điểm Listening và Reading tăng từ ${first} lên ${current}, mục tiêu ${target}`}
        className="mt-4 h-64 min-h-0 flex-1 sm:h-72"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
              tickMargin={10}
              padding={{ left: 20, right: 20 }}
            />
            <YAxis
              domain={[400, 800]}
              ticks={Y_TICKS}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
              width={48}
            />
            <Tooltip
              formatter={(value) => [`${String(value)} điểm`, 'Tổng LR']}
              cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.3 }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--border)',
                boxShadow: '0 8px 24px rgb(15 23 42 / 0.08)',
                fontSize: 13,
              }}
            />
            <ReferenceLine
              y={target}
              stroke="var(--destructive)"
              strokeDasharray="6 4"
              label={{
                value: `Mục tiêu ${target}`,
                position: 'insideTopRight',
                fill: 'var(--destructive)',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={{ r: 4, fill: '#fff', stroke: 'var(--primary)', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
