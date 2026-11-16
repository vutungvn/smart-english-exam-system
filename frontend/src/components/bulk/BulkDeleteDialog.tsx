import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';

interface BulkDeleteDialogProps {
  open: boolean;
  count: number;
  /** "câu hỏi", "nhóm câu", "đề thi" */
  noun: string;
  description: string;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
  /** Tùy chọn thêm (ví dụ ô "xóa cả câu trong nhóm") */
  children?: ReactNode;
}

export function BulkDeleteDialog({
  open,
  count,
  noun,
  description,
  busy,
  error,
  onClose,
  onConfirm,
  children,
}: BulkDeleteDialogProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      busy={busy}
      title={`Xóa ${count} ${noun}?`}
      description={description}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-destructive px-4 text-white hover:bg-destructive/90"
            disabled={busy}
            onClick={onConfirm}
          >
            <Trash2 />
            {busy ? 'Đang xóa…' : `Xóa ${count} ${noun}`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {children}
        {error && <FormAlert message={error} />}
      </div>
    </AppDialog>
  );
}
