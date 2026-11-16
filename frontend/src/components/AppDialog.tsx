import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Chiều rộng tối đa; dùng class cố định vì cn() không gộp class Tailwind trùng nhau
const SIZES = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-5xl' } as const;

interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** true khi đang gửi request: chặn đóng bằng Esc, bấm ra ngoài, nút X */
  busy?: boolean;
  footer: ReactNode;
  children: ReactNode;
  /** md (mặc định): hộp thoại xác nhận; lg: form nhiều ô */
  size?: keyof typeof SIZES;
}

// Khung hộp thoại dùng chung: Radix lo khóa focus, Esc, trả focus về nút đã mở
export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  busy = false,
  footer,
  children,
  size = 'md',
}: AppDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-white p-6 shadow-2xl shadow-slate-900/20 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            SIZES[size],
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-bold text-foreground">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              disabled={busy}
              aria-label="Đóng"
              className="-mt-1 -mr-1 rounded-lg p-1.5 text-subtle transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="mt-5">{children}</div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">{footer}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
