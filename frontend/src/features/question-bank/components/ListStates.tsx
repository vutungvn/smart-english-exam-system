import type { ReactNode } from 'react';
import { CircleCheck, CloudOff, RotateCw, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Các trạng thái dùng chung của trang danh sách: rỗng, lỗi, thông báo thành công

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  children,
}: {
  icon?: typeof SearchX;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <Icon className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-destructive">
        <CloudOff className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-foreground">Không tải được dữ liệu</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-5 h-10 rounded-xl px-4" onClick={onRetry}>
        <RotateCw />
        Thử lại
      </Button>
    </div>
  );
}

export function SuccessBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success-soft px-4 py-3 text-sm font-medium text-success"
    >
      <CircleCheck className="size-5 shrink-0" />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng thông báo"
        className="rounded-md p-1 hover:bg-success/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
