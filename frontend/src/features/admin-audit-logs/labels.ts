import {
  ClipboardCheck,
  Download,
  History,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { ExportAuditLogsDto, ListAuditLogsApiArg, RoleCode } from '@/api/generated';

export type AuditLogSort = NonNullable<ListAuditLogsApiArg['sort']>;
export type AuditExportFormat = NonNullable<ExportAuditLogsDto['format']>;

// Giờ hiển thị theo Việt Nam, server lưu UTC
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const ROLE_META: Record<RoleCode, { label: string; pill: string }> = {
  ADMIN: { label: 'Quản trị viên', pill: 'bg-amber-50 text-amber-700' },
  TEACHER: { label: 'Giáo viên', pill: 'bg-violet-50 text-violet-700' },
  STUDENT: { label: 'Học viên', pill: 'bg-accent text-brand' },
};

interface ActionMeta {
  icon: LucideIcon;
  /** Màu nền + chữ của huy hiệu hành động */
  tone: string;
}

/** Biểu tượng, màu theo phần sau dấu chấm của action (user.lock → lock) */
const ACTION_TONES: Record<string, ActionMeta> = {
  lock: { icon: Lock, tone: 'bg-danger-soft text-destructive' },
  unlock: { icon: LockOpen, tone: 'bg-emerald-50 text-emerald-700' },
  create: { icon: Plus, tone: 'bg-emerald-50 text-emerald-700' },
  delete: { icon: Trash2, tone: 'bg-danger-soft text-destructive' },
  update: { icon: Pencil, tone: 'bg-accent text-brand' },
  override: { icon: ClipboardCheck, tone: 'bg-violet-50 text-violet-700' },
  reset: { icon: RotateCcw, tone: 'bg-amber-50 text-amber-700' },
  export: { icon: Download, tone: 'bg-slate-100 text-slate-700' },
};
const DEFAULT_ACTION: ActionMeta = { icon: History, tone: 'bg-slate-100 text-slate-700' };

export function actionMeta(action: string): ActionMeta {
  return ACTION_TONES[action.split('.')[1] ?? ''] ?? DEFAULT_ACTION;
}

export const SORT_OPTIONS: { value: AuditLogSort; label: string }[] = [
  { value: 'createdAt:desc', label: 'Mới nhất trước' },
  { value: 'createdAt:asc', label: 'Cũ nhất trước' },
];

/** Tên trường trong before/after/meta */
const FIELD_LABELS: Record<string, string> = {
  // Người dùng
  fullName: 'Họ tên',
  status: 'Trạng thái',
  targetScore: 'Điểm mục tiêu',
  organization: 'Đơn vị công tác',
  specialization: 'Chuyên môn',
  // Bài chấm
  grader: 'Người chấm',
  score: 'Điểm',
  maxScore: 'Điểm tối đa',
  criteria: 'Điểm tiêu chí',
  feedback: 'Nhận xét',
  // Chương trình thi, chủ đề
  code: 'Mã',
  name: 'Tên',
  category: 'Loại',
  isActive: 'Đang dùng',
  parts: 'Part',
  description: 'Mô tả',
  subject: 'Chương trình thi',
  // Cấu hình hệ thống
  listening: 'Bảng Listening',
  reading: 'Bảng Reading',
  speaking: 'Bảng Speaking',
  writing: 'Bảng Writing',
  dailyBudget: 'Tổng lượt AI mỗi ngày',
  explainDailyLimit: 'Lượt giải thích mỗi học viên / ngày',
  retentionDays: 'Số ngày giữ bản ghi âm',
  group: 'Nhóm cấu hình',
  // Thông tin thêm
  reason: 'Lý do',
  attemptId: 'Mã bài làm',
  skill: 'Kỹ năng',
  part: 'Part',
  format: 'Định dạng tệp',
  rows: 'Số dòng',
  filters: 'Điều kiện lọc',
  from: 'Từ thời điểm',
  to: 'Đến thời điểm',
  q: 'Từ khóa',
  action: 'Hành động',
  entity: 'Đối tượng',
  entityId: 'Mã đối tượng',
  actorId: 'Người thực hiện',
};

export const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key;

/** Giá trị dạng mã (enum) đổi sang chữ dễ đọc */
const VALUE_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
  PENDING_VERIFICATION: 'Chờ xác minh email',
  PENDING_APPROVAL: 'Chờ duyệt',
  AI: 'AI',
  TEACHER: 'Giáo viên',
  DONE: 'Đã chấm',
  PENDING: 'Chờ chấm',
  FAILED: 'Chấm lỗi',
  LISTENING: 'Listening',
  READING: 'Reading',
  SPEAKING: 'Speaking',
  WRITING: 'Writing',
  scoring: 'Quy đổi điểm',
  ai: 'Hạn mức AI',
  recording: 'Ghi âm Speaking',
  csv: 'CSV',
  xlsx: 'Excel',
};

export const valueLabel = (value: string) => VALUE_LABELS[value] ?? value;

/** "22/11/2026 · 14:03:05": nhật ký cần đến giây để truy vết */
export function formatAuditTime(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  return {
    date: new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: TIME_ZONE,
    }).format(date),
    time: new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZone: TIME_ZONE,
    }).format(date),
  };
}

/** Ngày hôm nay theo giờ Việt Nam, dạng yyyy-MM-dd (giá trị của <input type="date">) */
export function todayVn(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE }).format(date);
}

/** Mã rút gọn để hiện trong bảng: 8 ký tự đầu của UUID */
export const shortId = (id: string) => id.slice(0, 8);

export const userPath = (id: string) => `/admin/users/${id}`;
export const AUDIT_LOGS_PATH = '/admin/audit-logs';

/** Link mở nhật ký đã lọc sẵn theo một đối tượng (trang chi tiết người dùng dùng) */
export const entityLogsPath = (entity: string, entityId: string) =>
  `${AUDIT_LOGS_PATH}?entity=${entity}&entityId=${entityId}`;
