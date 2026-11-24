import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';

/** Ngày trong kỳ thống kê hiểu theo giờ Việt Nam */
export const DASHBOARD_TIME_ZONE = 'Asia/Ho_Chi_Minh';
// Việt Nam không đổi giờ theo mùa nên lệch UTC cố định
const VN_OFFSET = '+07:00';

/** Không truyền from/to: xem 30 ngày gần nhất, tính cả hôm nay */
export const DEFAULT_RANGE_DAYS = 30;
/** Kỳ dài nhất (ngày): giới hạn số mốc biểu đồ và độ nặng truy vấn */
export const MAX_RANGE_DAYS = 366;

export const DASHBOARD_GRANULARITIES = ['day', 'week'] as const;
export type DashboardGranularity = (typeof DASHBOARD_GRANULARITIES)[number];

export const DASHBOARD_CACHE_PREFIX = 'dashboard:';
/** Số liệu tổng hợp được giữ trong Redis 5 phút, nút Làm mới xóa sớm hơn */
export const DASHBOARD_CACHE_TTL_SECONDS = 5 * 60;

const DAY_MS = 24 * 60 * 60 * 1000;
// sv-SE cho dạng yyyy-MM-dd
const dateFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: DASHBOARD_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Ngày hiện tại theo giờ Việt Nam, dạng yyyy-MM-dd */
export function todayInVietnam(now: Date): string {
  return dateFormat.format(now);
}

/** Cộng/trừ ngày trên chuỗi yyyy-MM-dd (tính theo UTC nên không bị lệch múi giờ) */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** 00:00 giờ Việt Nam của một ngày */
function vnMidnight(date: string): Date {
  return new Date(`${date}T00:00:00${VN_OFFSET}`);
}

export interface DashboardRange {
  /** yyyy-MM-dd, tính cả ngày này */
  from: string;
  /** yyyy-MM-dd, tính cả ngày này */
  to: string;
  /** 00:00 giờ VN của from */
  start: Date;
  /** 00:00 giờ VN của ngày sau to: truy vấn dùng nửa khoảng [start, endExclusive) */
  endExclusive: Date;
}

/** Kỳ thống kê từ query; thiếu to thì lấy hôm nay, thiếu from thì lùi DEFAULT_RANGE_DAYS ngày */
export function resolveRange(input: { from?: string; to?: string }, now: Date): DashboardRange {
  const to = input.to ?? todayInVietnam(now);
  const from = input.from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  if (from > to) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc',
    );
  }
  if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      `Khoảng thời gian xem tối đa ${MAX_RANGE_DAYS} ngày`,
    );
  }
  return { from, to, start: vnMidnight(from), endExclusive: vnMidnight(addDays(to, 1)) };
}

/** Ngày đầu mốc chứa date: chính ngày đó, hoặc thứ Hai của tuần (khớp date_trunc('week')) */
export function bucketStart(date: string, unit: DashboardGranularity): string {
  if (unit === 'day') return date;
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Chủ nhật
  return addDays(date, -((dayOfWeek + 6) % 7));
}

/**
 * Các mốc của biểu đồ, tăng dần. Theo tuần thì mốc đầu là thứ Hai của tuần chứa from (có thể
 * trước from), mốc đầu và cuối chỉ đếm phần nằm trong kỳ.
 */
export function bucketKeys(from: string, to: string, unit: DashboardGranularity): string[] {
  const step = unit === 'day' ? 1 : 7;
  const keys: string[] = [];
  for (let key = bucketStart(from, unit); key <= to; key = addDays(key, step)) keys.push(key);
  return keys;
}

export interface BucketCount {
  bucket: string;
  count: number;
}

/** Số đếm theo đúng thứ tự keys, mốc không có dữ liệu là 0 */
export function fillBuckets(keys: string[], rows: BucketCount[]): number[] {
  const counts = new Map(rows.map((row) => [row.bucket, row.count]));
  return keys.map((key) => counts.get(key) ?? 0);
}

export const dashboardCacheKeys = {
  overview: (range: DashboardRange) =>
    `${DASHBOARD_CACHE_PREFIX}overview:${range.from}:${range.to}`,
  trends: (range: DashboardRange, unit: DashboardGranularity) =>
    `${DASHBOARD_CACHE_PREFIX}trends:${range.from}:${range.to}:${unit}`,
};
