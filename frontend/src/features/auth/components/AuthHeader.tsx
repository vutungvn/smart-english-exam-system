import type { ReactNode } from 'react';
import logo from '@/assets/logo.svg';
import { cn } from '@/lib/utils';

interface AuthHeaderProps {
  badge: string;
  title: string;
  description?: ReactNode;
  // Form dài (Đăng ký): màn hình thấp thì ẩn bớt logo, nhãn, mô tả để vừa một màn hình
  compact?: boolean;
  children?: ReactNode;
}

export function AuthHeader({ badge, title, description, compact, children }: AuthHeaderProps) {
  return (
    <header
      className={cn(
        'mb-4 flex flex-col items-center gap-2 text-center tall:mb-6',
        compact && 'tall:mb-5',
      )}
    >
      <div
        className={cn(
          'mb-2 flex size-12 items-center justify-center rounded-2xl border border-blue-100 bg-accent p-1.5 shadow-sm',
          compact && 'tiny:hidden',
        )}
      >
        <img src={logo} alt="Smart English Exam" className="size-full rounded-lg object-contain" />
      </div>
      <span
        className={cn(
          'flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-primary uppercase',
          compact && 'tiny:hidden',
        )}
      >
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        {badge}
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {description && (
        <p
          className={cn(
            'max-w-sm text-sm text-muted-foreground',
            // Desktop chưa đủ cao thì nhường chỗ cho logo: bỏ mô tả trước
            compact && 'tiny:hidden lg:not-tall:hidden',
          )}
        >
          {description}
        </p>
      )}
      {children}
    </header>
  );
}
