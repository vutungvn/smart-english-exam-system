import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '@/components/FullPageLoader';
import { getChangePasswordPath, type RedirectState } from '@/features/auth/home-path';
import { useAppSelector } from '@/hooks/hooks';
import { selectAuthStatus, selectCurrentUser } from '@/store/slice/auth-slice';

// Route cần đăng nhập: chưa đăng nhập thì sang /login, ghi nhớ trang đang định vào để quay lại.
// Tài khoản bị buộc đổi mật khẩu (admin từ seed, tài khoản do admin tạo) chỉ ở được trang Đổi mật
// khẩu; backend cũng chặn API khác bằng 403 AUTH_PASSWORD_CHANGE_REQUIRED
export function RequireAuth() {
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();

  if (status === 'restoring') return <FullPageLoader />;

  if (status === 'guest') {
    const state: RedirectState = { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={state} />;
  }

  if (user?.mustChangePassword) {
    const passwordPath = getChangePasswordPath(user.role);
    if (location.pathname !== passwordPath) return <Navigate to={passwordPath} replace />;
  }

  return <Outlet />;
}
