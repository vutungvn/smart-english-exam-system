import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ConversionPointDto, SettingConversionRule } from '@/api/generated';

interface ConversionChartProps {
  points: ConversionPointDto[];
  defaults: ConversionPointDto[];
  rule: SettingConversionRule;
  rawLabel: string;
  label: string;
  color: string;
}

/** Vạch chia đều của trục điểm: LR 0–500 bước 100, SW 0–200 bước 50 */
function axisTicks(maxScore: number): number[] {
  const step = maxScore > 200 ? 100 : 50;
  return Array.from({ length: Math.ceil(maxScore / step) + 1 }, (_, i) => i * step);
}

/** Xem trước đường quy đổi đang sửa (nét liền) so với bảng mặc định (nét đứt) */
export function ConversionChart({
  points,
  defaults,
  rule,
  rawLabel,
  label,
  color,
}: ConversionChartProps) {
  const scoreTicks = axisTicks(rule.maxScore);
  const changed = JSON.stringify(points) !== JSON.stringify(defaults);

  return (
    <figure className="rounded-2xl border border-border p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-foreground">Xem trước {label}</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2" style={{ borderColor: color }} />
            Đang sửa
          </span>
          {changed && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-5 border-t-2 border-dashed border-slate-400" />
              Mặc định
            </span>
          )}
        </span>
      </figcaption>

      {/* Dữ liệu của biểu đồ chính là bảng mốc bên cạnh nên trình đọc màn hình không cần bản riêng */}
      <div
        role="img"
        aria-label={`Biểu đồ quy đổi ${label}: ${points.length} mốc, từ ${rule.minScore} đến ${rule.maxScore} điểm`}
        className="mt-3 h-64"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="raw"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              allowDuplicatedCategory={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              type="number"
              domain={[0, scoreTicks[scoreTicks.length - 1]]}
              ticks={scoreTicks}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: color, strokeOpacity: 0.3 }}
              content={({ active, payload }) => {
                const point = payload?.find((item) => item.name === 'current')?.payload as
                  ConversionPointDto | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg shadow-slate-900/10">
                    <p className="text-muted-foreground">
                      {rawLabel}: {point.raw}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">
                      {point.score} điểm
                    </p>
                  </div>
                );
              }}
            />
            {changed && (
              <Line
                name="default"
                data={defaults}
                dataKey="score"
                type="linear"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              name="current"
              data={points}
              dataKey="score"
              type="linear"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: '#fff', stroke: color }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-xs text-subtle">{rawLabel}</p>
    </figure>
  );
}
