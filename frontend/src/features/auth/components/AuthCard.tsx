import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  children: ReactNode;
  className?: string;
  accent?: boolean; // dải gradient trên đầu thẻ (màn Quên mật khẩu)
}

export function AuthCard({ children, className, accent }: AuthCardProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-100 bg-card p-6 shadow-xl shadow-slate-200/60 tall:sm:p-8',
        className,
      )}
    >
      {accent && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-brand via-primary to-highlight"
        />
      )}
      {children}
    </section>
  );
}
