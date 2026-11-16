import type { ReactNode } from 'react';
import { CircleAlert, X } from 'lucide-react';

interface FormAlertProps {
  message: string;
  onClose?: () => void;
  children?: ReactNode; // nút hành động: Khôi phục mật khẩu, Gửi lại email...
}

export function FormAlert({ message, onClose, children }: FormAlertProps) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-danger-soft p-3 text-left">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="flex-1 text-xs leading-relaxed font-medium text-on-danger-soft">
        <p>{message}</p>
        {children && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold">
            {children}
          </div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="rounded p-0.5 text-destructive hover:bg-destructive/10"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
