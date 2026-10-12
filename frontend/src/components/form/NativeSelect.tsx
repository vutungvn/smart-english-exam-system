import type { ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// <select> gốc của trình duyệt có giao diện theo hệ thống: bàn phím, trình đọc màn hình,
// danh sách chọn trên điện thoại đều dùng sẵn của trình duyệt
export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className={cn('relative', className)}>
      <select
        className="h-10 w-full cursor-pointer appearance-none truncate rounded-xl border border-border bg-white pr-9 pl-3 text-sm text-foreground outline-none transition-colors hover:border-slate-300 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-subtle aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
}
