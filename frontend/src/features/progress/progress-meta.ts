import type {
  GetScoreTrendApiArg,
  OpenSkillProgress,
  ScoreTrendPoint,
  Skill,
} from '@/api/generated';

export const PROGRESS_PATH = '/app/progress';
export const PROFILE_PATH = '/app/profile';

export type ProgressRange = NonNullable<GetScoreTrendApiArg>;

export const RANGE_LABEL: Record<ProgressRange, string> = {
  '30d': '30 ngày',
  '90d': '90 ngày',
  '1y': '1 năm',
  all: 'Tất cả',
};

/** Thước đo trên biểu đồ điểm, theo thứ tự trên nút chọn */
export const TREND_METRICS = ['toeic', 'speaking', 'writing', 'percent'] as const;
export type TrendMetric = (typeof TREND_METRICS)[number];

export const METRIC_LABEL: Record<TrendMetric, string> = {
  toeic: 'TOEIC LR',
  speaking: 'Speaking',
  writing: 'Writing',
  percent: 'Tỉ lệ điểm',
};

/** Điểm tối đa của thang */
export const METRIC_MAX: Record<TrendMetric, number> = {
  toeic: 990,
  speaking: 200,
  writing: 200,
  percent: 100,
};

const METRIC_SKILL: Record<'speaking' | 'writing', Skill> = {
  speaking: 'SPEAKING',
  writing: 'WRITING',
};

/** % làm tròn 1 chữ số; null khi điểm tối đa bằng 0 (giống percentOf ở backend) */
export function percentOf(earned: number, max: number): number | null {
  return max > 0 ? Math.round((earned / max) * 1000) / 10 : null;
}

/**
 * % điểm đạt của cả bài: câu trắc nghiệm 1 điểm, câu Speaking/Writing theo thang của dạng câu. Kỹ
 * năng còn câu chờ AI chấm thì tạm bỏ phần câu mở (giống cách tính % ở backend)
 */
export function pointPercent(point: ScoreTrendPoint): number | null {
  let earned = 0;
  let max = 0;
  for (const item of point.skillScores) {
    earned += item.correct;
    max += item.total;
    if (item.openRaw !== null) {
      earned += item.openRaw;
      max += item.openMax;
    }
  }
  return percentOf(earned, max);
}

/** Giá trị của một bài theo thước đo; null: bài không có giá trị này (không vẽ) */
export function metricValue(point: ScoreTrendPoint, metric: TrendMetric): number | null {
  switch (metric) {
    case 'percent':
      return pointPercent(point);
    case 'toeic':
      return point.scoring === 'TOEIC_990' ? point.scaledScore : null;
    default:
      return point.scoring === 'TOEIC_SW'
        ? (point.skillScores.find((item) => item.skill === METRIC_SKILL[metric])?.scaled ?? null)
        : null;
  }
}

/** "62.5%", "—" khi chưa có */
export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Number(value.toFixed(1))}%`;
}

/** "650", "150" hoặc "62.5%" theo thước đo */
export function formatMetric(value: number, metric: TrendMetric): string {
  return metric === 'percent' ? formatPercent(value) : `${value}`;
}

/** Cộng điểm Speaking/Writing của các kỹ năng */
export function openTotal(openSkills: readonly OpenSkillProgress[]) {
  return openSkills.reduce(
    (acc, item) => ({
      earned: acc.earned + item.earned,
      max: acc.max + item.max,
      scored: acc.scored + item.scored,
      pending: acc.pending + item.pending,
    }),
    { earned: 0, max: 0, scored: 0, pending: 0 },
  );
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
