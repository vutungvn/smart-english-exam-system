import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Clock3, FilePlus2 } from 'lucide-react';
import { useListInProgressAttemptsQuery, type InProgressAttempt } from '@/api/generated';
import { useCountdown } from '@/features/practice/attempt/use-countdown';
import { attemptPath, formatClock, PRACTICE_PATH } from '@/features/practice/practice-meta';

/** Bài làm dở gần nhất (cả đề có đồng hồ theo giờ server; luyện Part không đếm giờ) */
export function InProgressExamCard() {
  const { data, isLoading } = useListInProgressAttemptsQuery();
  const attempt = data?.data[0];

  if (isLoading) {
    return (
      <div aria-busy className="h-64 animate-pulse rounded-3xl border border-border bg-white" />
    );
  }
  if (!attempt) return <NoAttemptCard />;
  return <AttemptCard key={`${attempt.id}-${data?.data.length}`} attempt={attempt} />;
}

function AttemptCard({ attempt }: { attempt: InProgressAttempt }) {
  // Mốc hết giờ theo đồng hồ máy, quy từ số giây còn lại server trả về (không lệch giờ máy)
  const [deadline] = useState(() =>
    attempt.remainingSeconds === null ? null : Date.now() + attempt.remainingSeconds * 1000,
  );
  const remaining = useCountdown(deadline);
  const percent = attempt.totalQuestions
    ? Math.round((attempt.answeredCount / attempt.totalQuestions) * 100)
    : 0;

  return (
    <section className="flex flex-col rounded-3xl border border-l-4 border-border border-l-skill-writing bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <span className="size-1.5 rounded-full bg-skill-writing" />
          Đang làm dở
        </span>
        {remaining !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 tabular-nums">
            <Clock3 className="size-4" />
            Còn {formatClock(remaining)}
          </span>
        )}
      </div>

      <h2 className="mt-4 text-lg font-bold text-foreground">{attempt.exam.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {attempt.section
          ? `Luyện Part ${attempt.section.part} · ${attempt.section.name} · không tính giờ`
          : `Làm cả đề · ${attempt.exam.durationMinutes} phút`}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Tiến độ</span>
        <span className="font-semibold text-foreground">
          {attempt.answeredCount}/{attempt.totalQuestions} câu · {percent}%
        </span>
      </div>
      <div className="mt-2 mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-skill-writing" style={{ width: `${percent}%` }} />
      </div>

      <Link
        to={attemptPath(attempt.id)}
        className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-brand font-semibold text-white shadow-md shadow-primary/30 transition hover:brightness-95"
      >
        Làm tiếp
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

function NoAttemptCard() {
  return (
    <section className="flex flex-col rounded-3xl border border-border bg-white p-6 shadow-sm">
      <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
        <FilePlus2 className="size-5" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-foreground">Không có bài làm dở</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Chọn một đề để làm cả đề có tính giờ, hoặc luyện riêng từng Part không tính giờ.
      </p>
      <Link
        to={PRACTICE_PATH}
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-brand font-semibold text-white shadow-md shadow-primary/30 transition hover:brightness-95 xl:mt-auto"
      >
        Chọn đề luyện
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
