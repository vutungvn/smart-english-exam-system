import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useDeleteQuestionGroupMutation } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';

interface DeleteGroupDialogProps {
  /** Nhóm đang chờ xác nhận xóa; null thì đóng hộp thoại */
  group: { id: string; title: string; questionCount: number } | null;
  onClose: () => void;
  onDeleted: () => void;
}

// Nhóm còn câu thì xóa kèm các câu trong nhóm (withQuestions): nhóm là một khối, câu không đứng riêng được
export function DeleteGroupDialog({ group, onClose, onDeleted }: DeleteGroupDialogProps) {
  const [deleteGroup, { isLoading }] = useDeleteQuestionGroupMutation();
  const [error, setError] = useState<string>();
  const count = group?.questionCount ?? 0;

  const close = () => {
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    if (!group) return;
    setError(undefined);
    try {
      await deleteGroup({ id: group.id, withQuestions: count > 0 }).unwrap();
      onDeleted();
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'QUESTION_GROUP_NOT_FOUND') {
        onDeleted();
        return;
      }
      setError(
        apiError.code === 'FORBIDDEN' ? 'Bạn chỉ xóa được nhóm do mình tạo' : apiError.message,
      );
    }
  };

  return (
    <AppDialog
      open={group !== null}
      onOpenChange={(open) => !open && close()}
      title={count > 0 ? `Xóa nhóm và ${count} câu trong nhóm?` : 'Xóa nhóm câu?'}
      description={
        count > 0
          ? 'Nhóm và toàn bộ câu hỏi trong nhóm sẽ không còn trong ngân hàng. Không xóa được nếu có câu đang nằm trong đề đã xuất bản.'
          : 'Nhóm sẽ không còn trong danh sách và không chọn được khi soạn câu hỏi.'
      }
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
            {isLoading ? 'Đang xóa…' : count > 0 ? `Xóa nhóm và ${count} câu` : 'Xóa nhóm'}
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
