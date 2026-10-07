import { Link } from 'react-router';
import logo from '@/assets/logo.svg';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  inverse?: boolean; // dùng trên nền tối (footer)
  compact?: boolean; // màn hẹp (< 640px) chỉ hiện icon, nhường chỗ cho nút Đăng nhập/Đăng ký
  to?: string; // trang chủ theo khu vực: `/` (công khai), `/app` (học viên)...
}

export function BrandLogo({ inverse = false, compact = false, to = '/' }: BrandLogoProps) {
  return (
    <Link
      to={to}
      className="flex shrink-0 items-center gap-3"
      aria-label="Smart English Exam - Trang chủ"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-border">
        <img src={logo} alt="" className="size-full object-contain" />
      </span>
      <span className={cn('leading-tight whitespace-nowrap', compact && 'hidden sm:block')}>
        <span
          className={cn(
            'block text-base font-bold tracking-tight',
            inverse ? 'text-white' : 'text-foreground',
          )}
        >
          Smart English Exam
        </span>
        <span className={cn('block text-xs', inverse ? 'text-white/60' : 'text-subtle')}>
          Luyện thi TOEIC cùng AI
        </span>
      </span>
    </Link>
  );
}
