import { RotateCcw } from 'lucide-react';
import { AppDialog } from '@/components/AppDialog';
import { Button } from '@/components/ui/button';

interface ResetSettingsDialogProps {
  open: boolean;
  title: string;
  busy: boolean;
  /** Form đang có thay đổi chưa lưu */
  dirty: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ResetSettingsDialog({
  open,
  title,
  busy,
  dirty,
  onClose,
  onConfirm,
}: ResetSettingsDialogProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(value) => !value && onClose()}
      busy={busy}
      title="Khôi phục mặc định?"
      description={`Mọi tham số của nhóm "${title}" trở về giá trị mặc định của hệ thống.`}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4"
            disabled={busy}
            onClick={onClose}
          >
            Để sau
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl px-4"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            <RotateCcw />
            {busy ? 'Đang khôi phục…' : 'Khôi phục'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        Thay đổi có hiệu lực ngay và được ghi vào nhật ký kiểm toán.
        {dirty && ' Phần đang sửa chưa lưu cũng sẽ mất.'}
      </p>
    </AppDialog>
  );
}
