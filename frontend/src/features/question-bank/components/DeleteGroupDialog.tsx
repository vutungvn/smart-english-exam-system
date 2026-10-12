import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useDeleteQuestionGroupMutation } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';

interface DeleteGroupDialogProps {
  /** Nhóm đang chờ xác nhận xóa; null thì đóng hộp thoại */
  group: { id: string; title: string } | null;
  onClose: () => void;
  onDeleted: () => void;
}

// Backend chỉ cho xóa nhóm rỗng (QUESTION_GROUP_NOT_EMPTY): nơi gọi chỉ mở hộp thoại khi nhóm không còn câu
export function DeleteGroupDialog({ group, onClose, onDeleted }: DeleteGroupDialogProps) {
  const [deleteGroup, { isLoading }] = useDeleteQuestionGroupMutation();
  const [error, setError] = useState<string>();

  const close = () => {
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    if (!group) return;
    setError(undefined);
    try {
      await deleteGroup(group.id).unwrap();
      onDeleted();
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'QUESTION_GROUP_NOT_FOUND') {
        onDeleted();
        return;
      }
      setError(
        apiError.code === 'QUESTION_GROUP_NOT_EMPTY'
          ? 'Nhóm vẫn còn câu hỏi. Xóa hoặc chuyển hết câu trong nhóm trước.'
          : apiError.code === 'FORBIDDEN'
            ? 'Bạn chỉ xóa được nhóm do mình tạo'
            : apiError.message,
      );
    }
  };

  return (
    <AppDialog
      open={group !== null}
      onOpenChange={(open) => !open && close()}
      title="Xóa nhóm câu?"
      description="Nhóm sẽ không còn trong danh sách và không chọn được khi soạn câu hỏi."
      busy={isLoading}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            disabled={isLoading}
            onClick={close}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-destructive px-4 text-white hover:bg-destructive/90"
            disabled={isLoading}
            onClick={() => void confirm()}
          >
            <Trash2 />
            {isLoading ? 'Đang xóa…' : 'Xóa nhóm'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {group && (
          <p className="rounded-xl border-l-4 border-destructive/50 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            {group.title}
          </p>
        )}
        {error && <FormAlert message={error} onClose={() => setError(undefined)} />}
      </div>
    </AppDialog>
  );
}
