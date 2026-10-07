import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { SessionPanel } from './SessionPanel';

interface PreviewItem {
  to: string;
  label: string;
  note?: string;
  state?: unknown;
}

const SCREENS: PreviewItem[] = [
  { to: '/login', label: 'Đăng nhập', note: 'Đã nối API thật, đăng nhập xong quay về trang này' },
  { to: '/register', label: 'Đăng ký học viên', note: 'Gõ mật khẩu để xem thanh độ mạnh' },
  {
    to: '/register/check-email',
    label: 'Kiểm tra hộp thư',
    note: 'Nút gửi lại đang đếm ngược',
    state: { email: 'hocvien@gmail.com', justSent: true },
  },
  { to: '/verify-email?token=demo', label: 'Xác minh email: thành công' },
  { to: '/verify-email', label: 'Xác minh email: liên kết lỗi' },
  { to: '/forgot-password', label: 'Quên mật khẩu', note: 'Gửi form để xem trạng thái Đã gửi' },
  {
    to: '/reset-password?token=demo',
    label: 'Đặt lại mật khẩu',
    note: 'Gửi form để xem trạng thái thành công',
  },
  { to: '/reset-password', label: 'Đặt lại mật khẩu: liên kết hết hạn' },
];

// TẠM (giai đoạn giao diện): trang tiện kiểm tra các màn auth, bỏ khi có trang chủ thật
export function AuthPreviewPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Xem trước giao diện Auth</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Đăng nhập đã nối API; các màn khác vẫn giả lập.
        </p>
      </div>
      <SessionPanel />
      <ul className="flex flex-col gap-2">
        {SCREENS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              state={item.state}
              className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-xs transition-colors hover:bg-accent"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.label}</p>
                {item.note && <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>}
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
