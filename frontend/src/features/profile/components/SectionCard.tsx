import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode; // nội dung bên phải tiêu đề (chip, link)
  footer?: ReactNode; // hàng nút ở chân thẻ
  className?: string;
  children: ReactNode;
}

// Thẻ có tiêu đề kèm icon, dùng chung cho các khối của trang Hồ sơ và Đổi mật khẩu
export function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  footer,
  className,
  children,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-3xl border border-border bg-white p-6 shadow-2xs',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-balance text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>

      <div className="flex-1 pt-5">{children}</div>

      {footer && (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
          {footer}
        </div>
      )}
    </section>
  );
}
