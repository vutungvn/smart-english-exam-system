import type { DashboardGranularity, DashboardTrendPoint, GetOverviewApiArg } from '@/api/generated';
import { todayVn } from '@/features/admin-audit-logs/labels';

/** Kỳ xem chọn nhanh trên dashboard (không có "Hôm nay": biểu đồ chỉ còn 1 mốc) */
export const DASHBOARD_RANGES = [
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
  { key: '90d', label: '90 ngày', days: 90 },
  { key: 'month', label: 'Tháng này' },
] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number]['key'];
export const DEFAULT_RANGE: DashboardRange = '30d';

export const GRANULARITIES: { value: DashboardGranularity; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
];

/** Kỳ dài thì gom theo tuần cho biểu đồ đỡ dày */
export function defaultGranularity(range: DashboardRange): DashboardGranularity {
  return range === '90d' ? 'week' : 'day';
}

/** Kỳ chọn nhanh → from/to (yyyy-MM-dd, giờ Việt Nam, tính cả 2 đầu) gửi API */
export function rangeToArg(range: DashboardRange): Required<GetOverviewApiArg> {
  const to = todayVn();
  const preset = DASHBOARD_RANGES.find((item) => item.key === range);
  if (preset && 'days' in preset) return { from: todayVn(-(preset.days - 1)), to };
  return { from: `${to.slice(0, 8)}01`, to };
}

export type TrendMetric = Exclude<keyof DashboardTrendPoint, 'bucket'>;

export const TREND_METRICS: { value: TrendMetric; label: string; unit: string }[] = [
  { value: 'attempts', label: 'Lượt làm bài', unit: 'lượt làm bài' },
  { value: 'newUsers', label: 'Người dùng mới', unit: 'người dùng mới' },
  { value: 'logins', label: 'Lượt đăng nhập', unit: 'lượt đăng nhập' },
  { value: 'aiCalls', label: 'Lượt gọi AI', unit: 'lượt gọi AI' },
];

const numberFormat = new Intl.NumberFormat('vi-VN');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** % làm tròn 1 chữ số; null (chưa có lượt nào) → "—" */
export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${numberFormat.format(value)}%`;
}

/** yyyy-MM-dd → dd/MM. Tách chuỗi trực tiếp, không qua Date để không lệch múi giờ */
export function formatBucket(bucket: string): string {
  const [, month, day] = bucket.split('-');
  return `${day}/${month}`;
}

/** Nhãn đầy đủ của một mốc cho tooltip, bảng: "24/11/2026" hoặc "Tuần từ 23/11/2026" */
export function bucketLabel(bucket: string, granularity: DashboardGranularity): string {
  const [year, month, day] = bucket.split('-');
  const date = `${day}/${month}/${year}`;
  return granularity === 'week' ? `Tuần từ ${date}` : date;
}

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});
const dayFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  timeZone: TIME_ZONE,
});

/** "14:03 · 24/11": thời điểm tổng hợp số liệu theo giờ Việt Nam */
export function formatGeneratedAt(iso: string): string {
  const date = new Date(iso);
  return `${timeFormat.format(date)} · ${dayFormat.format(date)}`;
}

/** Danh sách giáo viên chờ duyệt (trang Duyệt giáo viên chưa có: dùng bộ lọc trang Người dùng) */
export const PENDING_TEACHERS_PATH = '/admin/users?role=TEACHER&status=PENDING_APPROVAL';
