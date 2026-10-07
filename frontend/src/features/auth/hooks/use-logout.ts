import { useNavigate } from 'react-router';
import { baseApi } from '@/api/base-api';
import { useLogoutMutation } from '@/api/generated';
import { useAppDispatch } from '@/hooks/hooks';
import { sessionCleared } from '@/store/slice/auth-slice';

// Đăng xuất: thu hồi refresh token ở server, xóa phiên và cache phía FE rồi về trang Đăng nhập
export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    // Gọi API lỗi (mất mạng...) vẫn xóa phiên phía FE
    await logout();
    dispatch(sessionCleared());
    dispatch(baseApi.util.resetApiState()); // xóa dữ liệu của người vừa đăng xuất
    void navigate('/login', { replace: true });
  };

  return { logout: handleLogout, isLoggingOut: isLoading };
}
