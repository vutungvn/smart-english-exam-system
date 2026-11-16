import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '@/components/FullPageLoader';
import type { RedirectState } from '@/features/auth/home-path';
import { useAppSelector } from '@/hooks/hooks';
import { selectAuthStatus } from '@/store/slice/auth-slice';

// Route cần đăng nhập: chưa đăng nhập thì sang /login, ghi nhớ trang đang định vào để quay lại
export function RequireAuth() {
  const status = useAppSelector(selectAuthStatus);
  const location = useLocation();

  if (status === 'restoring') return <FullPageLoader />;

  if (status === 'guest') {
    const state: RedirectState = { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={state} />;
  }

  return <Outlet />;
}
