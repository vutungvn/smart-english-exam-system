import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  icon: LucideIcon;
  /** Màu nền + chữ của ô biểu tượng */
  tone: string;
  value: ReactNode;
  caption?: ReactNode;
  /** Phần chi tiết dưới đường kẻ (theo Stitch: các dòng số phụ) */
  children?: ReactNode;
}

/** Thẻ chỉ số: tiêu đề, số lớn, dòng phụ và vùng chi tiết bên dưới */
export function StatCard({ title, icon: Icon, tone, value, caption, children }: StatCardProps) {
  return (
    <section className="flex flex-col rounded-3xl border border-border bg-white shadow-2xs">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="mt-2 text-3xl font-bold text-foreground tabular-nums">{value}</p>
          {caption && <p className="mt-1 text-sm text-muted-foreground">{caption}</p>}
        </div>
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}>
          <Icon className="size-5" />
        </span>
      </div>
      {children && (
        <div className="mt-auto space-y-2 rounded-b-3xl border-t border-border bg-slate-50/70 px-5 py-4 text-sm">
          {children}
        </div>
      )}
    </section>
  );
}

/** Một dòng "nhãn ……… số" trong vùng chi tiết của thẻ */
export function StatRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      aria-hidden
      className="h-52 animate-pulse rounded-3xl border border-border bg-white p-5 shadow-2xs"
    >
      <div className="h-4 w-28 rounded bg-slate-100" />
      <div className="mt-3 h-8 w-20 rounded bg-slate-100" />
      <div className="mt-8 space-y-2">
        <div className="h-3 rounded bg-slate-100" />
        <div className="h-3 w-3/4 rounded bg-slate-100" />
      </div>
    </div>
  );
}
