import { useState } from 'react';
import { CircleAlert, Lightbulb, LoaderCircle, RotateCw, Sparkles } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useGetAiExplanationQuery,
  useGetMyAiQuotasQuery,
  type AiExplanation,
  type AiQuota,
  type ReviewQuestion,
} from '@/api/generated';
import { cn } from '@/lib/utils';

interface AiExplanationPanelProps {
  attemptId: string;
  question: ReviewQuestion;
}

/**
 * "Giải thích bằng AI" của một câu trắc nghiệm ở màn xem lại. Chỉ gọi API khi học viên bấm: AI sinh
 * mới thì tốn 1 lượt trong ngày, câu đã có lời giải thích sẵn (người khác hỏi trước) thì không tốn
 */
export function AiExplanationPanel({ attemptId, question }: AiExplanationPanelProps) {
  const [requested, setRequested] = useState(false);
  const { data, error, isFetching, refetch } = useGetAiExplanationQuery(
    { id: attemptId, examQuestionId: question.examQuestionId },
    { skip: !requested },
  );
  const quota = useGetMyAiQuotasQuery().data?.data.explanation;
  const explanation = data?.data;

  if (explanation) return <ExplanationView explanation={explanation} question={question} />;

  if (isFetching) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-4 rounded-2xl border border-primary/20 bg-accent/40 px-4 py-3"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-brand">
          <LoaderCircle className="size-4 animate-spin" />
          AI đang viết lời giải thích…
        </p>
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-3 w-11/12 animate-pulse rounded bg-white" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-white" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white" />
        </div>
      </div>
    );
  }

  if (error) {
    const apiError = toApiError(error);
    // Hết lượt: thử lại cũng vậy cho tới khi sang ngày mới
    const quotaExceeded = apiError.code === 'AI_QUOTA_EXCEEDED';
    return (
      <div
        role="alert"
        className={cn(
          'mt-4 flex flex-wrap items-start gap-x-3 gap-y-2 rounded-2xl px-4 py-3 text-sm',
          quotaExceeded ? 'bg-amber-50 text-amber-800' : 'bg-danger-soft text-destructive',
        )}
      >
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <p className="min-w-0 flex-1">{apiError.message}</p>
        {!quotaExceeded && (
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <RotateCw className="size-3.5" />
            Thử lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        onClick={() => setRequested(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-accent px-3.5 py-2 text-sm font-semibold text-brand transition-colors hover:border-primary/60"
      >
        <Sparkles className="size-4" />
        Giải thích bằng AI
      </button>
      {quota && <QuotaHint quota={quota} />}
    </div>
  );
}

function QuotaHint({ quota }: { quota: AiQuota }) {
  if (quota.remaining > 0) {
    return (
      <span className="text-xs text-subtle tabular-nums">
        Còn {quota.remaining}/{quota.limit} lượt hôm nay
      </span>
    );
  }
  return (
    <span className="text-xs text-amber-700">
      Hết lượt hôm nay (lượt mới lúc {formatTime(quota.resetAt)}); câu đã có lời giải thích sẵn vẫn
      xem được
    </span>
  );
}

function ExplanationView({
  explanation,
  question,
}: {
  explanation: AiExplanation;
  question: ReviewQuestion;
}) {
  const { quota } = explanation;
  return (
    <section
      aria-label={`Giải thích bằng AI câu ${question.number}`}
      className="mt-4 rounded-2xl border border-primary/20 bg-accent/40 px-4 py-3 text-sm leading-relaxed"
    >
      <h3 className="flex flex-wrap items-center gap-2 font-semibold text-brand">
        <Sparkles className="size-4" />
        Giải thích bằng AI
        {explanation.model === 'fake' && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Dữ liệu mẫu
          </span>
        )}
      </h3>
      <p className="mt-2 wrap-break-word whitespace-pre-line text-slate-800">
        {explanation.summary}
      </p>

      <ul aria-label="Từng phương án" className="mt-3 space-y-2">
        {explanation.options.map((item) => {
          const option = question.options.find((o) => o.label === item.label);
          const correct = option?.isCorrect ?? false;
          const chosen = !!option && option.id === question.selectedOptionId;
          return (
            <li
              key={item.label}
              className={cn(
                'flex gap-3 rounded-xl px-3 py-2',
                correct ? 'bg-emerald-50' : chosen ? 'bg-danger-soft' : 'bg-white',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  correct
                    ? 'bg-emerald-500 text-white'
                    : chosen
                      ? 'bg-destructive text-white'
                      : 'bg-slate-100 text-slate-600',
                )}
              >
                {item.label}
              </span>
              <p className="min-w-0 flex-1 wrap-break-word text-slate-700">
                {chosen && (
                  <span
                    className={cn(
                      'mr-1.5 font-semibold',
                      correct ? 'text-success' : 'text-destructive',
                    )}
                  >
                    Bạn chọn ·
                  </span>
                )}
                {item.reason}
              </p>
            </li>
          );
        })}
      </ul>

      {explanation.keyPoints.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-subtle">Từ vựng, ngữ pháp cần nhớ</p>
          <ul className="mt-1.5 space-y-1">
            {explanation.keyPoints.map((point) => (
              <li key={point.term} className="wrap-break-word text-slate-700">
                <span className="font-semibold text-foreground">{point.term}</span>: {point.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {explanation.tip && (
        <p className="mt-3 flex gap-2 rounded-xl bg-white px-3 py-2 text-slate-700">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <span className="min-w-0 wrap-break-word">
            <span className="font-semibold text-foreground">Mẹo: </span>
            {explanation.tip}
          </span>
        </p>
      )}

      <p className="mt-3 text-xs text-subtle">
        Nội dung do AI tạo, có thể chưa chính xác; hãy đối chiếu với đáp án và giải thích của giáo
        viên.{' '}
        {explanation.cached
          ? 'Lời giải thích có sẵn, không tính lượt.'
          : `Còn ${quota.remaining}/${quota.limit} lượt hôm nay.`}
      </p>
    </section>
  );
}

/** "14:00" theo giờ máy học viên */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
