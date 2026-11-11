import { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Hourglass,
  AudioLines,
  Loader2,
  MessageSquareText,
  RotateCcw,
  SpellCheck2,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useRegradeAssessmentMutation, type QuestionAssessment } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTime } from '../practice-meta';
import { scoreLevel } from './review-meta';

/** speaking: bài nói (có transcript, Part 1 có điểm con) · writing: bài viết (có câu sửa) */
export type AssessmentKind = 'speaking' | 'writing';

interface AssessmentPanelProps {
  attemptId: string;
  assessment: QuestionAssessment;
  kind: AssessmentKind;
}

const KIND_TEXT: Record<AssessmentKind, { rubric: string; improved: string; answer: string }> = {
  speaking: {
    rubric: 'Theo rubric TOEIC Speaking, không phải điểm chính thức của ETS',
    improved: 'Câu trả lời gợi ý',
    answer: 'bài nói',
  },
  writing: {
    rubric: 'Theo rubric TOEIC Writing, không phải điểm chính thức của ETS',
    improved: 'Bài viết lại gợi ý',
    answer: 'bài viết',
  },
};

const LEVEL_TONE = {
  high: 'bg-emerald-50 text-success',
  mid: 'bg-sky-50 text-sky-700',
  low: 'bg-rose-50 text-rose-700',
} as const;

/**
 * Kết quả AI chấm một câu Speaking/Writing (SPRINT-86): điểm câu (Speaking Part 1 kèm 2 điểm con),
 * điểm tiêu chí, nhận xét, lời nói AI nghe được (Speaking), câu sửa (Writing), bài làm gợi ý; đang
 * chấm thì báo chờ, chấm lỗi thì có nút "Chấm lại" (tối đa 2 lần)
 */
export function AssessmentPanel({ attemptId, assessment, kind }: AssessmentPanelProps) {
  const text = KIND_TEXT[kind];
  if (assessment.status === 'PENDING') {
    return <PendingNote assessment={assessment} answer={text.answer} />;
  }
  if (assessment.status === 'FAILED') {
    return <FailedNote attemptId={attemptId} assessment={assessment} kind={kind} />;
  }

  const score = assessment.score ?? 0;
  const level = scoreLevel(score, assessment.maxScore);
  return (
    <section
      aria-label="Kết quả AI chấm"
      className="mt-4 space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'inline-flex items-baseline gap-1 rounded-2xl px-3 py-1.5 font-bold tabular-nums',
            LEVEL_TONE[level],
          )}
        >
          <span className="text-2xl">{score}</span>
          <span className="text-sm">/ {assessment.maxScore}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Bot className="size-4 text-sky-600" />
            Điểm ước lượng do AI chấm
          </p>
          <p className="text-xs text-subtle">{text.rubric}</p>
        </div>
      </div>

      {assessment.subScores.length > 0 && (
        <ul aria-label="Điểm thành phần" className="flex flex-wrap gap-2 text-sm">
          {assessment.subScores.map((item) => (
            <li
              key={item.key}
              className="rounded-xl bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-border"
            >
              {item.label}:{' '}
              <span className="text-foreground tabular-nums">
                {item.score}/{item.max}
              </span>
            </li>
          ))}
        </ul>
      )}

      {assessment.criteria.length > 0 && (
        <dl
          className={cn(
            'grid gap-2 sm:grid-cols-2',
            assessment.criteria.length > 4 && 'lg:grid-cols-3',
          )}
        >
          {assessment.criteria.map((criterion) => (
            <div key={criterion.key} className="rounded-xl bg-white px-3 py-2 ring-1 ring-border">
              <div className="flex items-center justify-between gap-2 text-xs">
                <dt className="font-semibold text-slate-700">{criterion.label}</dt>
                <dd className="font-bold text-foreground tabular-nums">{criterion.score}/5</dd>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-linear-to-r from-sky-400 to-primary"
                  style={{ width: `${(criterion.score / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      )}

      {kind === 'speaking' && assessment.transcript && (
        <div className="text-sm">
          <h4 className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
            <AudioLines className="size-4 text-sky-600" />
            AI nghe được bạn nói
          </h4>
          <p className="rounded-xl bg-white px-3 py-2 leading-relaxed wrap-break-word whitespace-pre-line text-slate-700 italic ring-1 ring-border">
            {assessment.transcript}
          </p>
        </div>
      )}

      {assessment.feedback && (
        <div className="text-sm leading-relaxed text-slate-800">
          <h4 className="mb-1 flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-4 text-sky-600" />
            Nhận xét
          </h4>
          <p className="wrap-break-word whitespace-pre-line">{assessment.feedback}</p>
        </div>
      )}

      {assessment.corrections.length > 0 && (
        <div className="text-sm">
          <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
            <SpellCheck2 className="size-4 text-sky-600" />
            Câu cần sửa ({assessment.corrections.length})
          </h4>
          <ul className="space-y-2">
            {assessment.corrections.map((item, index) => (
              <li key={index} className="rounded-xl bg-white px-3 py-2 ring-1 ring-border">
                <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                  <span className="text-destructive line-through decoration-destructive/50 wrap-break-word">
                    {item.original}
                  </span>
                  <ArrowRight className="hidden size-4 shrink-0 text-subtle sm:mt-0.5 sm:block" />
                  <span className="font-semibold text-success wrap-break-word">
                    {item.corrected}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-600">{item.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {assessment.improvedAnswer && (
        <details className="group rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-800 select-none [&::-webkit-details-marker]:hidden">
            <WandSparkles className="size-4 text-primary" />
            {text.improved}
            <span className="ml-auto text-xs font-medium text-primary group-open:hidden">Xem</span>
            <span className="ml-auto hidden text-xs font-medium text-primary group-open:inline">
              Thu gọn
            </span>
          </summary>
          <p className="mt-2 leading-relaxed wrap-break-word whitespace-pre-line text-slate-700">
            {assessment.improvedAnswer}
          </p>
        </details>
      )}
    </section>
  );
}

function PendingNote({ assessment, answer }: { assessment: QuestionAssessment; answer: string }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
      {assessment.nextRunAt ? (
        <Hourglass className="mt-0.5 size-4 shrink-0" />
      ) : (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
      )}
      {assessment.nextRunAt
        ? `AI tạm hết lượt hôm nay, bài sẽ được chấm tiếp sau ${formatTime(assessment.nextRunAt)}.`
        : `AI đang chấm ${answer} này, kết quả tự hiện khi chấm xong.`}
    </p>
  );
}

function FailedNote({ attemptId, assessment }: AssessmentPanelProps) {
  const [regrade, { isLoading }] = useRegradeAssessmentMutation();
  const [error, setError] = useState<string>();
  const canRegrade = assessment.regradesLeft > 0;

  const run = async () => {
    setError(undefined);
    try {
      await regrade({ id: attemptId, assessmentId: assessment.id }).unwrap();
    } catch (cause) {
      setError(toApiError(cause).message);
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <p className="flex items-start gap-2 font-semibold">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        Chưa chấm được câu này: {assessment.errorMessage ?? 'AI không trả kết quả hợp lệ.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={!canRegrade || isLoading}
          onClick={() => void run()}
          className="h-9 rounded-xl bg-rose-600 px-4 text-white hover:bg-rose-700"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <RotateCcw />}
          Chấm lại
        </Button>
        <span className="text-xs">
          {canRegrade
            ? `Còn ${assessment.regradesLeft} lượt chấm lại`
            : 'Đã hết lượt chấm lại, vui lòng liên hệ giáo viên'}
        </span>
      </div>
      {error && <p className="text-xs font-semibold">{error}</p>}
    </div>
  );
}
