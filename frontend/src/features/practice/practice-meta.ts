import type { ScoringScale } from '@/api/generated';

// Khu học viên: luyện đề và làm bài (SPRINT-54)

export const PRACTICE_PATH = '/app/exams';
export const practiceExamPath = (id: string) => `${PRACTICE_PATH}/${id}`;
/** Màn làm bài (chế độ tập trung, không có sidebar) */
export const attemptPath = (id: string) => `/app/attempts/${id}`;
export const attemptResultPath = (id: string) => `/app/attempts/${id}/result`;

/** Tên loại đề cho học viên (giáo viên dùng nhãn ngắn hơn ở EXAM_TYPE_META) */
export const SCALE_META: Record<ScoringScale, { label: string; pill: string }> = {
  TOEIC_990: { label: 'TOEIC Listening & Reading', pill: 'bg-accent text-brand' },
  TOEIC_SW: { label: 'TOEIC Speaking & Writing', pill: 'bg-violet-50 text-violet-700' },
  PERCENT: { label: 'Luyện tập', pill: 'bg-slate-100 text-slate-700' },
};

export const SCALE_OPTIONS: readonly ScoringScale[] = ['TOEIC_990', 'TOEIC_SW', 'PERCENT'];

/** 18:42 · 1:05:09 */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Số từ của bài viết (Writing) */
export function countWords(text: string | null | undefined): number {
  return text?.trim() ? text.trim().split(/\s+/).length : 0;
}

/** 14:20 · 16/10/2026 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${date.toLocaleDateString('vi-VN')}`;
}
