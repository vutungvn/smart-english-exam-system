import type { ReactNode } from 'react';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  icon: ReactNode;
  /** danger: nút đỏ (xóa, ẩn) */
  tone?: 'primary' | 'danger';
  busy: boolean;
  error?: string;
  /** false: chỉ có nút Đóng (thao tác không làm được, nội dung giải thích lý do) */
  canConfirm?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}

/** Hộp thoại xác nhận dùng chung cho ẩn/hiện, xóa chương trình thi và chủ đề */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  icon,
  tone = 'primary',
  busy,
  error,
  canConfirm = true,
  onClose,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(value) => !value && onClose()}
      busy={busy}
      title={title}
      description={description}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4"
            disabled={busy}
            onClick={onClose}
          >
            {canConfirm ? 'Hủy' : 'Đóng'}
          </Button>
          {canConfirm && (
            <Button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={cn(
                'h-10 rounded-xl px-4',
                tone === 'danger' && 'bg-destructive text-white hover:bg-destructive/90',
              )}
            >
              {icon}
              {busy ? 'Đang xử lý…' : confirmLabel}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        {error && <FormAlert message={error} />}
        {children}
      </div>
    </AppDialog>
  );
}
