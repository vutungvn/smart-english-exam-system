import type { RoleCode } from '@/api/generated';

export const ROLE_LABELS: Record<RoleCode, string> = {
  STUDENT: 'Học viên',
  TEACHER: 'Giáo viên',
  ADMIN: 'Quản trị viên',
};

// Chữ cái đầu của 2 từ cuối trong họ tên, dùng cho avatar: "Nguyễn Minh Anh" → "MA"
export function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
