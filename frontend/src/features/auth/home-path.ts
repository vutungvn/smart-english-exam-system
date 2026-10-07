import type { RoleCode } from '@/api/generated';

// Trang chủ của từng vai trò (kế hoạch Mục 8.1): học viên /app, giáo viên /teacher, admin /admin.
// TẠM: chưa có layout giáo viên/admin nên tạm về trang xem trước phiên đăng nhập
const HOME_PATHS: Record<RoleCode, string> = {
  STUDENT: '/app',
  TEACHER: '/dev/auth',
  ADMIN: '/dev/auth',
};

export function getHomePath(role: RoleCode): string {
  return HOME_PATHS[role];
}

// Trang người dùng định vào trước khi bị chuyển sang Đăng nhập (RequireAuth gắn vào location.state)
export interface RedirectState {
  from?: string;
}
