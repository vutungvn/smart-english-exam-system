import { Link } from 'react-router';
import { LoaderCircle, LogOut, RefreshCw } from 'lucide-react';
import { baseApi } from '@/api/base-api';
import { toApiError } from '@/api/errors';
import { useGetProfileQuery, useLogoutMutation } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/hooks/hooks';
import { selectCurrentUser, sessionCleared } from '@/store/slice/auth-slice';

// TẠM (giai đoạn nền tảng): kiểm tra đăng nhập, GET /me, tự làm mới token và đăng xuất.
// Bỏ cùng AuthPreviewPage khi có layout và trang Hồ sơ.
export function SessionPanel() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const { data, error, isFetching, refetch } = useGetProfileQuery(undefined, { skip: !user });
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  const handleLogout = async () => {
    // Gọi API lỗi (mất mạng...) vẫn xóa phiên phía FE
    await logout();
    dispatch(sessionCleared());
    dispatch(baseApi.util.resetApiState()); // xóa cache dữ liệu của người vừa đăng xuất
  };

  if (!user) {
    return (
      <section className="rounded-xl bg-card p-4 text-sm shadow-xs">
        Chưa đăng nhập.{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Đăng nhập
        </Link>
      </section>
    );
  }

  const profile = data?.data;

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm shadow-xs">
      <div>
        <p className="font-semibold">
          {user.fullName} · {user.role}
        </p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>

      <div className="rounded-lg bg-secondary p-3 text-xs">
        <p className="mb-1 font-semibold">GET /me</p>
        {isFetching ? (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" /> Đang tải...
          </p>
        ) : error ? (
          <p className="text-destructive">{toApiError(error).message}</p>
        ) : profile ? (
          <p>
            Trạng thái {profile.status}, đăng nhập lần cuối{' '}
            {profile.lastLoginAt
              ? new Date(profile.lastLoginAt).toLocaleString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                })
              : '—'}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
          <RefreshCw /> Gọi lại GET /me
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loggingOut}
          onClick={() => void handleLogout()}
        >
          <LogOut /> Đăng xuất
        </Button>
      </div>
    </section>
  );
}
