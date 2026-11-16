import { ArrowRight, CirclePlay, Timer } from 'lucide-react';
import type { InProgressAttempt } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { attemptPath, formatClock, practiceExamPath } from '../practice-meta';

/** Bài đang làm dở gần nhất: vào lại trang luyện đề là thấy ngay nút "Làm tiếp" */
export function ContinueBanner({ attempt }: { attempt: InProgressAttempt }) {
  const percent = attempt.totalQuestions
    ? Math.round((attempt.answeredCount / attempt.totalQuestions) * 100)
    : 0;
  const scope = attempt.section
    ? `Luyện Part ${attempt.section.part} · ${attempt.section.name}`
    : 'Làm cả đề';

  return (
    <section
      aria-label="Bài đang làm dở"
      className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-accent p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-brand text-white shadow-md shadow-primary/30">
          <CirclePlay className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-bold text-foreground">
            <span className="truncate">Bạn đang làm dở {attempt.exam.title}</span>
            {attempt.remainingSeconds !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-brand">
                <Timer className="size-3.5" />
                còn {formatClock(attempt.remainingSeconds)}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {scope} · Đã làm {attempt.answeredCount}/{attempt.totalQuestions} câu ·{' '}
            <span className="font-semibold text-brand">{percent}%</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ButtonLink
          to={practiceExamPath(attempt.exam.id)}
          variant="ghost"
          className="h-10 w-auto px-3 text-slate-600"
        >
          Xem đề
        </ButtonLink>
        <ButtonLink to={attemptPath(attempt.id)} className="h-10 w-auto px-4">
          Làm tiếp
          <ArrowRight />
        </ButtonLink>
      </div>
    </section>
  );
}
