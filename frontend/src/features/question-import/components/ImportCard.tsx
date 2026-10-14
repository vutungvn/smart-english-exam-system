import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Thẻ trắng bo góc dùng chung cho các khối của trang nhập */
export function ImportCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-3xl border border-border bg-white shadow-2xs',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** Nội dung bên phải tiêu đề */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
      <h2 className="flex items-center gap-2.5 font-bold text-foreground">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
          <Icon className="size-4" />
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}
