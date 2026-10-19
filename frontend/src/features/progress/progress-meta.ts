import type { GetScoreTrendApiArg, ScoreTrendPoint } from '@/api/generated';

export const PROGRESS_PATH = '/app/progress';
export const PROFILE_PATH = '/app/profile';

export type ProgressRange = NonNullable<GetScoreTrendApiArg>;

export const RANGE_LABEL: Record<ProgressRange, string> = {
  '30d': '30 ngày',
  '90d': '90 ngày',
  '1y': '1 năm',
  all: 'Tất cả',
};

/** Thước đo trên biểu đồ điểm */
export type TrendMetric = 'percent' | 'toeic';

export const METRIC_LABEL: Record<TrendMetric, string> = {
  percent: 'Tỉ lệ đúng',
  toeic: 'Điểm TOEIC LR',
};

/** Giá trị của một bài theo thước đo; null: bài không có giá trị này (không vẽ) */
export function metricValue(point: ScoreTrendPoint, metric: TrendMetric): number | null {
  if (metric === 'percent') return point.choicePercent;
  return point.scoring === 'TOEIC_990' ? point.scaledScore : null;
}

/** "62.5%", "—" khi chưa có */
export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Number(value.toFixed(1))}%`;
}

/** 17/10 */
export function formatShortDate(iso: string): string {
  // Không dùng toLocaleDateString: tiếng Việt cho ra "19-10"
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** "Làm cả đề" hoặc "Luyện Part 5 · Incomplete Sentences" */
export function modeLabel(point: Pick<ScoreTrendPoint, 'section'>): string {
  return point.section ? `Luyện Part ${point.section.part} · ${point.section.name}` : 'Làm cả đề';
}
