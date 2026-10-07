import { Navigate, Outlet } from 'react-router';
import type { RoleCode } from '@/api/generated';
import { getHomePath } from '@/features/auth/home-path';
import { useAppSelector } from '@/hooks/hooks';
import { selectCurrentUser } from '@/store/slice/auth-slice';

// Đặt bên trong RequireAuth. Sai vai trò thì về trang chủ của vai trò mình.
// Chỉ để ẩn giao diện không thuộc vai trò; server mới là nơi kiểm tra quyền thật (kế hoạch Mục 8.1)
export function RequireRole({ roles }: { roles: readonly RoleCode[] }) {
  const user = useAppSelector(selectCurrentUser);

  if (!user) return null; // RequireAuth đã chặn trường hợp chưa đăng nhập
  if (!roles.includes(user.role)) return <Navigate to={getHomePath(user.role)} replace />;

  return <Outlet />;
}
