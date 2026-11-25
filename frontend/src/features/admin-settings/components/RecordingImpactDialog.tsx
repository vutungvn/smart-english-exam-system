import { Trash2, TriangleAlert } from 'lucide-react';
import { AppDialog } from '@/components/AppDialog';
import { Button } from '@/components/ui/button';

export interface RecordingImpactState {
  days: number;
  /** null: không đếm được (lỗi mạng), vẫn hỏi xác nhận */
  count: number | null;
}

interface RecordingImpactDialogProps {
  impact: RecordingImpactState | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** Cảnh báo trước khi giảm số ngày giữ: bản ghi quá hạn bị xóa vĩnh viễn ở lần dọn kế tiếp */
export function RecordingImpactDialog({
  impact,
  busy,
  onClose,
  onConfirm,
}: RecordingImpactDialogProps) {
  return (
    <AppDialog
      open={impact !== null}
      onOpenChange={(value) => !value && onClose()}
      busy={busy}
      title="Giảm số ngày giữ bản ghi âm?"
      description={`Bản ghi đã nộp quá ${impact?.days ?? ''} ngày sẽ bị xóa khỏi hệ thống.`}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4"
            disabled={busy}
            onClick={onClose}
          >
            Quay lại
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-destructive px-4 text-white hover:bg-destructive/90"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            <Trash2 />
            {busy ? 'Đang lưu…' : 'Vẫn lưu'}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-2xl bg-danger-soft p-4 text-sm text-on-danger-soft">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">
            {impact?.count == null
              ? 'Không đếm được số bản ghi bị ảnh hưởng.'
              : `${impact.count.toLocaleString('vi-VN')} bản ghi âm sẽ bị xóa vĩnh viễn lúc 3 giờ sáng.`}
          </p>
          <p>
            Không khôi phục lại được. Điểm, nội dung lời nói và nhận xét của bài làm vẫn giữ nguyên.
          </p>
        </div>
      </div>
    </AppDialog>
  );
}
