import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MessageSquareWarning, Send, UserRoundSearch } from 'lucide-react';
import { z } from 'zod';
import { toApiError } from '@/api/errors';
import { useRequestAssessmentReviewMutation, type ReviewQuestion } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FieldError } from '@/components/form/FieldError';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';
import { textareaClass } from '@/features/question-bank/form/styles';
import { formatDateTime } from '../practice-meta';

const NOTE_MAX = 300;
const schema = z.object({
  note: z
    .string()
    .trim()
    .min(5, 'Lý do dài ít nhất 5 ký tự')
    .max(NOTE_MAX, `Lý do tối đa ${NOTE_MAX} ký tự`),
});
type FormValues = z.infer<typeof schema>;

/**
 * Học viên yêu cầu giáo viên chấm lại câu AI đã chấm (SPRINT-91), mỗi câu một lần, kèm lý do. Đã gửi
 * thì hiện trạng thái chờ; giáo viên chấm xong thì AssessmentPanel hiện bản giáo viên
 */
export function ReviewRequestBox({
  attemptId,
  question,
}: {
  attemptId: string;
  question: ReviewQuestion;
}) {
  const [open, setOpen] = useState(false);
  const { assessment, reviewRequest } = question;
  if (!assessment || assessment.grader === 'TEACHER') return null;

  if (reviewRequest) {
    return (
      <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
        <UserRoundSearch className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">
            Đã gửi yêu cầu giáo viên chấm lại lúc {formatDateTime(reviewRequest.requestedAt)}
          </p>
          <p className="mt-0.5 wrap-break-word text-violet-800">Lý do: {reviewRequest.note}</p>
          <p className="mt-1 text-xs text-violet-700">
            Giáo viên chấm xong bạn sẽ nhận thông báo, điểm bài làm tự tính lại.
          </p>
        </div>
      </div>
    );
  }
  // Câu chấm lỗi đã tự vào hàng đợi của giáo viên; đang chấm thì chờ AI xong
  if (assessment.status !== 'DONE') return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <span className="text-muted-foreground">Thấy điểm AI chưa hợp lý?</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 rounded-xl border-violet-200 px-3 text-violet-700 hover:bg-violet-50"
      >
        <MessageSquareWarning />
        Yêu cầu giáo viên chấm lại
      </Button>
      {open && (
        <RequestDialog
          attemptId={attemptId}
          assessmentId={assessment.id}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function RequestDialog({
  attemptId,
  assessmentId,
  onClose,
}: {
  attemptId: string;
  assessmentId: string;
  onClose: () => void;
}) {
  const [request, { isLoading }] = useRequestAssessmentReviewMutation();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { note: '' } });

  const submit = handleSubmit(async ({ note }) => {
    setError(undefined);
    try {
      await request({ id: attemptId, assessmentId, requestReviewDto: { note } }).unwrap();
      onClose();
    } catch (cause) {
      setError(toApiError(cause).message);
    }
  });

  return (
    <AppDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title="Yêu cầu giáo viên chấm lại"
      description="Mỗi câu chỉ gửi được một lần. Điểm giáo viên chấm sẽ thay cho điểm AI."
      busy={isLoading}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 rounded-xl px-4"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="review-request-form"
            disabled={isLoading}
            className="h-10 rounded-xl px-4"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
            Gửi yêu cầu
          </Button>
        </>
      }
    >
      <form id="review-request-form" onSubmit={(event) => void submit(event)} className="space-y-3">
        {error && <FormAlert message={error} />}
        <label htmlFor="review-note" className="text-xs font-semibold text-slate-700">
          Lý do <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="review-note"
          {...register('note')}
          maxLength={NOTE_MAX}
          placeholder="Ví dụ: Em nghĩ bài nói đã trả lời đủ 2 ý nhưng AI cho điểm thấp."
          aria-invalid={!!errors.note}
          className={textareaClass}
        />
        <FieldError message={errors.note?.message} />
      </form>
    </AppDialog>
  );
}
