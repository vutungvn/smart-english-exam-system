import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useDeleteQuestionMutation } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';

interface DeleteQuestionDialogProps {
  /** Câu đang chờ xác nhận xóa; null thì đóng hộp thoại */
  question: { id: string; content: string } | null;
  onClose: () => void;
  onDeleted: () => void;
}

// Xóa mềm ở backend: đề thi, bài làm cũ vẫn giữ tham chiếu tới câu này
export function DeleteQuestionDialog({ question, onClose, onDeleted }: DeleteQuestionDialogProps) {
  const [deleteQuestion, { isLoading }] = useDeleteQuestionMutation();
  const [error, setError] = useState<string>();

  const close = () => {
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    if (!question) return;
    setError(undefined);
    try {
      await deleteQuestion(question.id).unwrap();
      onDeleted();
    } catch (err) {
      const apiError = toApiError(err);
      // Đã bị xóa ở tab khác: coi như xong, danh sách tự tải lại
      if (apiError.code === 'QUESTION_NOT_FOUND') {
        onDeleted();
        return;
      }
      setError(
        apiError.code === 'FORBIDDEN' ? 'Bạn chỉ xóa được câu hỏi do mình tạo' : apiError.message,
      );
    }
  };

  return (
    <AppDialog
      open={question !== null}
      onOpenChange={(open) => !open && close()}
      title="Xóa câu hỏi?"
      description="Câu hỏi sẽ không còn hiện trong ngân hàng và không chọn được khi tạo đề mới. Đề thi đã dùng câu này vẫn giữ nguyên."
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
            {isLoading ? 'Đang xóa…' : 'Xóa câu hỏi'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {question && (
          <blockquote className="line-clamp-3 rounded-xl border-l-4 border-destructive/50 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {question.content}
          </blockquote>
        )}
        {error && <FormAlert message={error} onClose={() => setError(undefined)} />}
      </div>
    </AppDialog>
  );
}
