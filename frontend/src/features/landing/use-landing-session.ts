import type { AuthSessionUser } from '@/api/generated';
import { getHomePath } from '@/features/auth/home-path';
import { useAppSelector } from '@/hooks/hooks';
import { selectAuthStatus, selectCurrentUser } from '@/store/slice/auth-slice';

type LandingSession =
  | { state: 'loading' | 'guest' } // loading: đang khôi phục phiên khi vừa mở trang
  | { state: 'signed-in'; user: AuthSessionUser; homePath: string; enterLabel: string };

// Landing mở cho mọi người; đã đăng nhập thì các nút Đăng nhập/Đăng ký đổi thành nút vào trang học
export function useLandingSession(): LandingSession {
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectCurrentUser);

  if (status === 'authenticated' && user) {
    return {
      state: 'signed-in',
      user,
      homePath: getHomePath(user.role),
      enterLabel: user.role === 'STUDENT' ? 'Vào học ngay' : 'Vào trang quản lý',
    };
  }
  return { state: status === 'restoring' ? 'loading' : 'guest' };
}
