import type { Level } from '@/api/generated';

// Giờ hiển thị theo Việt Nam (kế hoạch Mục 8.2), server lưu UTC
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function formatDate(iso: string): string {
  // "12/09/2026": luôn đủ 2 chữ số ngày/tháng và 4 chữ số năm
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

// "07/10/2026 · 14:20"
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date);
  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  }).format(date);
  return `${day} · ${time}`;
}

export const LEVEL_LABELS: Record<Level, string> = {
  BEGINNER: 'Sơ cấp',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
};

// Lý do đăng nhập thất bại do backend ghi vào login_histories.failure_reason
const FAILURE_LABELS: Record<string, string> = {
  INVALID_PASSWORD: 'Sai mật khẩu',
  TOO_MANY_ATTEMPTS: 'Bị khóa tạm',
  EMAIL_NOT_VERIFIED: 'Chưa xác minh email',
  PENDING_APPROVAL: 'Chờ duyệt',
  ACCOUNT_LOCKED: 'Tài khoản bị khóa',
};

export function describeFailure(reason: string | null): string {
  return (reason && FAILURE_LABELS[reason]) ?? 'Thất bại';
}

// Thứ tự quan trọng: UA của Edge/Opera cũng chứa "Chrome", UA của Chrome chứa "Safari"
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];
const SYSTEMS: [RegExp, string][] = [
  [/Windows/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
];

/** Đọc User-Agent thành "Chrome trên Windows", đủ để người dùng nhận ra thiết bị của mình */
export function describeUserAgent(userAgent: string | null): { label: string; mobile: boolean } {
  if (!userAgent) return { label: 'Không rõ thiết bị', mobile: false };

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'Trình duyệt khác';
  const os = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];

  return {
    label: os ? `${browser} trên ${os}` : browser,
    mobile: /Android|iPhone|iPod|Mobile/.test(userAgent),
  };
}
