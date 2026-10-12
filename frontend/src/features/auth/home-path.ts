import type { RoleCode } from '@/api/generated';
import { useAppSelector } from '@/hooks/hooks';
import { selectCurrentUser } from '@/store/slice/auth-slice';

// Gốc khu vực của từng vai trò (kế hoạch Mục 8.1): học viên /app, giáo viên /teacher, admin /admin.
// Trang hồ sơ, đổi mật khẩu nằm dưới gốc này: /app/profile, /teacher/profile...
const AREA_PATHS: Record<RoleCode, string> = {
  STUDENT: '/app',
  TEACHER: '/teacher',
  // TẠM: chưa có layout admin nên tạm về trang xem trước phiên đăng nhập
  ADMIN: '/dev/auth',
};

export function getHomePath(role: RoleCode): string {
  return AREA_PATHS[role];
}

/** Gốc khu vực của người đang đăng nhập; dùng cho link dùng chung giữa các vai trò (hồ sơ, menu) */
export function useAreaPath(): string {
  const user = useAppSelector(selectCurrentUser);
  return user ? AREA_PATHS[user.role] : '/app';
}

// Trang người dùng định vào trước khi bị chuyển sang Đăng nhập (RequireAuth gắn vào location.state)
export interface RedirectState {
  from?: string;
}
