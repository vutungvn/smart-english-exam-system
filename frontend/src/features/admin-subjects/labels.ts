import type { SubjectCategory } from '@/api/generated';
import { adminPath } from '@/features/admin/admin-nav';

export const SUBJECTS_PATH = adminPath('subjects');
export const subjectPath = (id: string) => `${SUBJECTS_PATH}/${id}`;

export const CATEGORY_META: Record<SubjectCategory, { label: string; pill: string }> = {
  TOEIC: { label: 'TOEIC', pill: 'bg-accent text-brand' },
  IELTS: { label: 'IELTS', pill: 'bg-rose-50 text-rose-700' },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as SubjectCategory[];

/** Khớp SUBJECT_CODE_PATTERN ở backend (subject-rules.ts) */
export const SUBJECT_CODE_PATTERN = /^[A-Z0-9_]{2,50}$/;

export const formatCount = (value: number) => value.toLocaleString('vi-VN');

/** Thông báo thành công mang theo khi chuyển trang (xóa xong quay về danh sách) */
export interface FlashState {
  flash?: string;
}
