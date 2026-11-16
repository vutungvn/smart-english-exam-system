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
  { to: '/login', label: 'Đăng nhập', note: 'Gọi API thật' },
  { to: '/register', label: 'Đăng ký học viên', note: 'Gọi API thật, gửi thư xác minh tới Gmail' },
  {
    to: '/register/check-email',
    label: 'Kiểm tra hộp thư',
    note: 'Nút gửi lại gọi API thật',
    state: { email: 'hocvien@gmail.com', justSent: true },
  },
  {
    to: '/verify-email',
    label: 'Xác minh email: liên kết lỗi',
    note: 'Liên kết thật nằm trong thư',
  },
  { to: '/forgot-password', label: 'Quên mật khẩu', note: 'Gọi API thật, gửi liên kết tới Gmail' },
  {
    to: '/reset-password',
    label: 'Đặt lại mật khẩu: liên kết hết hạn',
    note: 'Liên kết thật nằm trong thư',
  },
];

// TẠM (giai đoạn giao diện): trang tiện kiểm tra các màn auth, bỏ khi có trang chủ thật
export function AuthPreviewPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Xem trước giao diện Auth</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Các màn auth đã nối API thật; liên kết xác minh, đặt lại mật khẩu được gửi qua Gmail.
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
