import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '@/components/FullPageLoader';
import { getHomePath, type RedirectState } from '@/features/auth/home-path';
import { useAppSelector } from '@/hooks/hooks';
import { selectAuthStatus, selectCurrentUser } from '@/store/slice/auth-slice';

// Trang chỉ dành cho khách (landing, đăng nhập, đăng ký...): đã đăng nhập thì chuyển về trang của mình.
// Ưu tiên trang đang định vào (from) để khớp với điều hướng của LoginPage ngay sau khi đăng nhập
export function GuestOnly() {
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();

  if (status === 'restoring') return <FullPageLoader />;

  if (status === 'authenticated' && user) {
    const from = (location.state as RedirectState | null)?.from;
    return <Navigate to={from ?? getHomePath(user.role)} replace />;
  }

  return <Outlet />;
}
