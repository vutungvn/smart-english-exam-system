import { LoaderCircle } from 'lucide-react';
import logo from '@/assets/logo.svg';

// Màn chờ khi đang khôi phục phiên đăng nhập, tránh trang "chớp" sang Đăng nhập rồi quay lại
export function FullPageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-border">
        <img src={logo} alt="" className="size-full object-contain" />
      </span>
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin text-primary" />
        Đang tải...
      </span>
    </div>
  );
}
