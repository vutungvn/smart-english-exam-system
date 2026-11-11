import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import {
  Bot,
  CircleCheck,
  Eye,
  History,
  Hourglass,
  ListRestart,
  Loader2,
  Timer,
  TriangleAlert,
  Trophy,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useGetAttemptQuery,
  type AttemptResult,
  type GradingProgress,
  type SkillScoreItem,
} from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { cn } from '@/lib/utils';
import {
  attemptPath,
  attemptReviewPath,
  formatDateTime,
  formatTime,
  PRACTICE_PATH,
  practiceExamPath,
  resultsPath,
} from '../practice-meta';
import {
  choiceSummary,
  formatScore,
  GRADING_POLL_MS,
  hasChoice,
  hasOpen,
  isGrading,
  scoreLabel,
} from '../review/review-meta';

/** Kết quả sau khi nộp (bản gọn); đáp án từng câu ở trang Xem lại (AttemptReviewPage) */
export function AttemptResultPage() {
  const { id = '' } = useParams();
  const [polling, setPolling] = useState(false);
  // Bài Speaking/Writing đang chờ AI chấm: hỏi lại mỗi 5 giây tới khi chấm xong (hoặc chỉ còn câu chấm lỗi)
  const { data, error, isLoading, refetch } = useGetAttemptQuery(id, {
    refetchOnMountOrArgChange: true,
    pollingInterval: polling ? GRADING_POLL_MS : 0,
    skipPollingIfUnfocused: true,
  });
  const grading = isGrading(data?.data.result);
  if (grading !== polling) setPolling(grading);

  if (isLoading) return <div className="h-96 animate-pulse rounded-3xl bg-white" aria-hidden />;
  if (error && !data) {
    return (
      <div className="rounded-3xl border border-border bg-white">
        <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!data) return null;
  const attempt = data.data;
  if (attempt.status === 'IN_PROGRESS') return <Navigate to={attemptPath(attempt.id)} replace />;
  if (!attempt.result) {
    return (
      <div className="rounded-3xl border border-border bg-white">
        <EmptyState title="Bài làm đã hủy" description="Bài này đã hủy nên không có kết quả.">
          <ButtonLink to={practiceExamPath(attempt.exam.id)} className="h-10 w-auto px-5">
            Về đề thi
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  const result = attempt.result;
  // Nộp lúc đã hết giờ (đồng hồ ở trình duyệt về 0, hoặc job phía server tự nộp) là bài tự nộp
  const autoSubmitted =
    attempt.expiresAt !== null &&
    new Date(result.submittedAt).getTime() >= new Date(attempt.expiresAt).getTime() - 2000;
  return (
    <div className="space-y-6">
      <title>{`Kết quả – ${attempt.exam.title}`}</title>
      <PageHeader
        breadcrumbs={[
          { label: 'Luyện đề thi', to: PRACTICE_PATH },
          { label: attempt.exam.title, to: practiceExamPath(attempt.exam.id) },
          { label: 'Kết quả' },
        ]}
        title="Kết quả bài làm"
        description={
          attempt.section
            ? `${attempt.exam.title} · Luyện Part ${attempt.section.part} · ${attempt.section.name}`
            : `${attempt.exam.title} · Làm cả đề`
        }
      />

      {autoSubmitted && (
        <p className="flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <Timer className="size-4 shrink-0" />
          Đã hết giờ, hệ thống tự nộp bài với các câu bạn đã trả lời.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {result.grading && result.status === 'SUBMITTED' && (
            <GradingCard grading={result.grading} reviewPath={attemptReviewPath(attempt.id)} />
          )}
          {!result.grading && result.pendingOpenCount > 0 && (
            <p className="flex items-start gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Hourglass className="mt-0.5 size-4 shrink-0" />
              {result.pendingOpenCount} câu Speaking/Writing đang chờ AI chấm. Điểm tổng sẽ cập nhật
              khi chấm xong.
            </p>
          )}
          <ScoreHero result={result} />
          <SkillScores skills={result.skillScores} scoring={result.scoring} />
        </div>

        <aside className="space-y-3 rounded-3xl border border-border bg-white p-5 shadow-2xs">
          <h2 className="font-bold text-foreground">Tiếp theo</h2>
          <ButtonLink to={PRACTICE_PATH} className="h-11">
            Về danh sách đề
          </ButtonLink>
          <ButtonLink
            to={practiceExamPath(attempt.exam.id)}
            variant="secondary"
            className="h-11 bg-white ring-1 ring-border"
          >
            <ListRestart />
            Làm lại đề
          </ButtonLink>
          <ButtonLink
            to={attemptReviewPath(attempt.id)}
            variant="secondary"
            className="h-11 bg-white ring-1 ring-border"
          >
            <Eye />
            {hasOpen(result) ? 'Xem lại bài và nhận xét' : 'Xem lại đáp án'}
          </ButtonLink>
          <ButtonLink
            to={resultsPath(attempt.exam.id)}
            variant="ghost"
            className="h-10 text-sm text-slate-600"
          >
            <History />
            Lịch sử làm đề này
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}

function ScoreHero({ result }: { result: AttemptResult }) {
  const score = formatScore(result);
  const choice = hasChoice(result);
  const open = hasOpen(result);
  // Còn câu chờ AI chấm: tạm hiện % phần trắc nghiệm (đề chỉ có câu mở thì chưa có gì để hiện)
  const choiceTotal = result.correctCount + result.wrongCount + result.skippedCount;
  const partial = choiceTotal
    ? `${Number(((result.correctCount / choiceTotal) * 100).toFixed(2))}%`
    : '—';
  const [value, max] = score?.split(' / ') ?? [];

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-2xs sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-brand text-white shadow-md shadow-primary/30">
          <Trophy className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-subtle">
            {score === null
              ? choice
                ? 'Điểm phần trắc nghiệm (tạm tính)'
                : `${scoreLabel(result)} (đang chấm)`
              : scoreLabel(result)}
          </p>
          <p className="text-4xl font-bold text-foreground tabular-nums sm:text-5xl">
            {score === null ? partial : value}
            {max && <span className="text-xl font-semibold text-subtle"> / {max}</span>}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Nộp lúc {formatDateTime(result.submittedAt)} · {choiceSummary(result)}
            {result.scoring !== 'PERCENT' &&
              ' · Quy đổi theo bảng tham khảo, không phải điểm chính thức của ETS'}
          </p>
          {open && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              <Bot className="size-3.5" />
              Điểm Speaking/Writing là điểm ước lượng do AI chấm
            </p>
          )}
        </div>
      </div>

      {choice && (
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Đúng" value={result.correctCount} tone="text-success bg-emerald-50" />
          <Stat label="Sai" value={result.wrongCount} tone="text-destructive bg-danger-soft" />
          <Stat label="Bỏ trống" value={result.skippedCount} tone="text-slate-600 bg-slate-100" />
        </dl>
      )}
    </section>
  );
}

/** Tiến độ AI chấm Speaking/Writing (trang tự hỏi lại server tới khi chấm xong) */
function GradingCard({ grading, reviewPath }: { grading: GradingProgress; reviewPath: string }) {
  const percent = grading.total ? (grading.done / grading.total) * 100 : 0;
  const running = grading.pending > 0;
  return (
    <section
      aria-live="polite"
      className="space-y-3 rounded-3xl border border-amber-300/60 bg-amber-50 p-5 text-amber-900"
    >
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <TriangleAlert className="size-5" />
        )}
        <h2 className="font-bold">{running ? 'AI đang chấm bài làm' : 'Còn câu chưa chấm được'}</h2>
        <span className="ml-auto text-sm font-semibold tabular-nums">
          Đã chấm {grading.done}/{grading.total} câu
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-400 to-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="space-y-1 text-sm">
        {grading.waitingUntil ? (
          <li className="flex items-start gap-2">
            <Hourglass className="mt-0.5 size-4 shrink-0" />
            AI tạm hết lượt hôm nay, các câu còn lại sẽ được chấm tiếp sau{' '}
            {formatTime(grading.waitingUntil)}.
          </li>
        ) : (
          running && (
            <li className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              Trang tự cập nhật, bạn có thể rời trang và quay lại sau.
            </li>
          )
        )}
        {grading.failed > 0 && (
          <li className="flex flex-wrap items-center gap-2 font-semibold text-rose-700">
            <TriangleAlert className="size-4 shrink-0" />
            {grading.failed} câu chấm lỗi.
            <ButtonLink to={reviewPath} variant="ghost" className="h-8 w-auto px-2 text-rose-700">
              Xem và chấm lại
            </ButtonLink>
          </li>
        )}
      </ul>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn('rounded-2xl px-3 py-3 text-center', tone)}>
      <dt className="text-xs font-semibold">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function SkillScores({
  skills,
  scoring,
}: {
  skills: SkillScoreItem[];
  scoring: AttemptResult['scoring'];
}) {
  const scaleMax = scoring === 'TOEIC_990' ? 495 : scoring === 'TOEIC_SW' ? 200 : null;
  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
      <h2 className="font-bold text-foreground">Điểm theo kỹ năng</h2>
      <ul className="mt-4 space-y-4">
        {skills.map((skill) => {
          const open = skill.openCount > 0;
          const openDone = open && skill.openRaw !== null;
          // Câu mở: tỉ lệ điểm thô; câu trắc nghiệm: tỉ lệ câu đúng
          const percent = open
            ? openDone && skill.openMax > 0
              ? ((skill.openRaw ?? 0) / skill.openMax) * 100
              : 0
            : skill.total
              ? (skill.correct / skill.total) * 100
              : 0;
          return (
            <li key={skill.skill} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <SkillPill skill={skill.skill} />
                  {skill.total > 0 && (
                    <span className="text-muted-foreground">
                      {skill.correct}/{skill.total} câu đúng
                    </span>
                  )}
                  {openDone && (
                    <span className="text-muted-foreground">
                      Điểm thô {skill.openRaw}/{skill.openMax}
                    </span>
                  )}
                </span>
                <span className="font-bold text-foreground tabular-nums">
                  {skill.scaled === null ? (
                    <span className="font-normal text-subtle italic">
                      Đang chờ AI chấm{skill.openPending > 0 && ` ${skill.openPending} câu`}
                    </span>
                  ) : scaleMax !== null ? (
                    `${skill.scaled} / ${scaleMax}`
                  ) : (
                    `${Number(skill.scaled.toFixed(2))}%`
                  )}
                </span>
              </div>
              {(skill.total > 0 || openDone) && (
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-primary to-brand"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
