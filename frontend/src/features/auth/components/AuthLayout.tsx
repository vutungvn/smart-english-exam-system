import { Outlet } from 'react-router';
import { Lock } from 'lucide-react';
import { AuthBanner } from './AuthBanner';

// Desktop: banner trái + form phải, cả hai cao đúng một màn hình; mobile/tablet: chỉ có form
export function AuthLayout() {
  return (
    <div className="min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[58fr_42fr] lg:overflow-hidden xl:grid-cols-[3fr_2fr]">
      <AuthBanner />

      {/* Form dài hơn màn hình (Đăng ký) thì chỉ cột này cuộn, banner đứng yên */}
      <div className="relative overflow-hidden bg-background lg:h-dvh lg:overflow-y-auto">
        {/* Quầng sáng trang trí, chỉ hiện trên mobile/tablet khi không có banner */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-[32px] lg:hidden"
        />

        <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6 lg:min-h-full tiny:py-3 tall:py-12">
          <Outlet />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-subtle/80">
            <Lock className="size-3.5" />
            Kết nối bảo mật • Smart English Exam (256-bit SSL)
          </p>
        </main>
      </div>
    </div>
  );
}
