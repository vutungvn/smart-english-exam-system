import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AuthCard } from './AuthCard';

const TONE_CLASSES = {
  info: 'bg-primary ring-accent',
  success: 'bg-success ring-success-soft/50',
  error: 'bg-destructive ring-danger-soft',
} as const;

interface ResultCardProps {
  tone: keyof typeof TONE_CLASSES;
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

// Thẻ kết quả dùng chung: đã gửi email, thành công, liên kết lỗi
export function ResultCard({ tone, icon, title, description, children }: ResultCardProps) {
  return (
    <AuthCard className="flex flex-col items-center gap-5 p-6 text-center">
      <div
        className={cn(
          'flex size-14 items-center justify-center rounded-full text-primary-foreground shadow-md ring-8 [&_svg]:size-6',
          TONE_CLASSES[tone],
        )}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>
        )}
      </div>
      {children && <div className="flex w-full flex-col gap-3">{children}</div>}
    </AuthCard>
  );
}
