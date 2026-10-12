import type { ReactNode } from 'react';

interface FormSectionProps {
  step: number;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

// Khối đánh số của form soạn câu hỏi: đi từ trên xuống theo thứ tự cần nhập
export function FormSection({ step, title, description, action, children }: FormSectionProps) {
  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-brand">
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
