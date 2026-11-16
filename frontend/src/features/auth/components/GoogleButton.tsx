import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Chuyển cả trang sang backend (không gọi fetch): backend chuyển tiếp sang Google,
// xong thì đặt refresh cookie và đưa về /app, restoreSession() tự lấy lại phiên
const GOOGLE_LOGIN_URL = '/api/v1/auth/google';

interface GoogleButtonProps {
  label?: string;
  className?: string;
}

// Đăng nhập Google chỉ dành cho học viên; email mới sẽ được tạo tài khoản học viên ngay
export function GoogleButton({ label = 'Tiếp tục với Google', className }: GoogleButtonProps) {
  const [redirecting, setRedirecting] = useState(false);

  // Bấm Back từ trang Google: trình duyệt khôi phục trang từ bộ nhớ đệm (bfcache) với
  // trạng thái cũ, phải tắt vòng xoay thì mới bấm lại được
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      <Button
        asChild
        variant="outline"
        className={cn(
          'h-11 w-full gap-3 rounded-xl border-slate-200/90 bg-white text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:shadow-xs',
          redirecting && 'pointer-events-none opacity-70',
        )}
      >
        <a
          href={GOOGLE_LOGIN_URL}
          aria-disabled={redirecting}
          onClick={(event) => {
            // Chặn bấm 2 lần trong lúc đang chuyển trang
            if (redirecting) event.preventDefault();
            else setRedirecting(true);
          }}
        >
          {redirecting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <GoogleIcon className="size-4" />
          )}
          {label}
        </a>
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-subtle">
        Khi tiếp tục bằng Google, bạn đồng ý với{' '}
        <span className="font-semibold text-slate-600">Điều khoản sử dụng</span> và{' '}
        <span className="font-semibold text-slate-600">Chính sách xử lý dữ liệu cá nhân</span>.
      </p>
    </div>
  );
}
