import type { ImportIssue } from '@/api/generated';

export const IMPORT_PATH = '/teacher/import';

/** Giới hạn của backend (backend/src/modules/question-import/import-format.ts), dùng để chặn sớm và hiển thị */
export const IMPORT_LIMITS = {
  zipBytes: 100 * 1024 * 1024,
  zipTotalMb: 300,
  questionRows: 2000,
  groupRows: 500,
  audioMb: 20,
  imageMb: 5,
} as const;

export type IssueSheet = ImportIssue['sheet'];

export const SHEET_META: Record<IssueSheet, { label: string; pill: string }> = {
  file: { label: 'Tệp', pill: 'bg-slate-100 text-slate-700' },
  groups: { label: 'groups', pill: 'bg-violet-50 text-violet-700' },
  questions: { label: 'questions', pill: 'bg-accent text-brand' },
  media: { label: 'media/', pill: 'bg-amber-50 text-amber-700' },
};

export const SHEET_ORDER: readonly IssueSheet[] = ['file', 'groups', 'questions', 'media'];

/** 18,4 MB · 512 KB */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('vi-VN')} KB`;
}

/** 15:42 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/** Kiểm tra sớm ở trình duyệt; backend vẫn kiểm tra lại nội dung tệp */
export function checkZipFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.zip')) return 'Chỉ nhận tệp .zip';
  if (file.size > IMPORT_LIMITS.zipBytes) return 'Tệp lớn hơn 100 MB, hãy chia thành nhiều tệp';
  if (file.size === 0) return 'Tệp rỗng';
  return null;
}
