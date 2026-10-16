import { Navigate, useParams } from 'react-router';
import { Eye, Hourglass, ListRestart, Timer, Trophy } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetAttemptQuery, type AttemptResult, type SkillScoreItem } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { cn } from '@/lib/utils';
import { attemptPath, formatDateTime, PRACTICE_PATH, practiceExamPath } from '../practice-meta';

/** Kết quả sau khi nộp (bản gọn). Xem lại đáp án từng câu làm ở SPRINT-55 */
export function AttemptResultPage() {
  const { id = '' } = useParams();
  const { data, error, isLoading, refetch } = useGetAttemptQuery(id, {
    refetchOnMountOrArgChange: true,
  });

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
          <ScoreHero result={result} />
          {result.pendingOpenCount > 0 && (
            <p className="flex items-start gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Hourglass className="mt-0.5 size-4 shrink-0" />
              {result.pendingOpenCount} câu Speaking/Writing đang chờ AI chấm. Điểm tổng sẽ cập nhật
              khi chấm xong.
            </p>
          )}
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
          <Button
            type="button"
            variant="outline"
            disabled
            className="h-11 w-full rounded-xl font-semibold"
          >
            <Eye />
            Xem lại đáp án (sắp có)
          </Button>
        </aside>
      </div>
    </div>
  );
}

function ScoreHero({ result }: { result: AttemptResult }) {
  const toeic = result.scoring === 'TOEIC_990';
  const score =
    result.scaledScore === null
      ? null
      : toeic
        ? `${result.scaledScore}`
        : `${Number(result.scaledScore.toFixed(2))}%`;
  // Còn câu chờ AI chấm: tạm hiện % phần trắc nghiệm
  const choiceTotal = result.correctCount + result.wrongCount + result.skippedCount;
  const partial = choiceTotal
    ? `${Number(((result.correctCount / choiceTotal) * 100).toFixed(2))}%`
    : '—';

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-2xs sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-brand text-white shadow-md shadow-primary/30">
          <Trophy className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-subtle">
            {score === null
              ? 'Điểm phần trắc nghiệm (tạm tính)'
              : toeic
                ? 'Điểm TOEIC Listening & Reading'
                : 'Tỉ lệ câu đúng'}
          </p>
          <p className="text-4xl font-bold text-foreground tabular-nums sm:text-5xl">
            {score ?? partial}
            {toeic && score !== null && (
              <span className="text-xl font-semibold text-subtle"> / 990</span>
            )}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Nộp lúc {formatDateTime(result.submittedAt)}
            {toeic && ' · Quy đổi theo bảng tham khảo, không phải điểm chính thức của ETS'}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Đúng" value={result.correctCount} tone="text-success bg-emerald-50" />
        <Stat label="Sai" value={result.wrongCount} tone="text-destructive bg-danger-soft" />
        <Stat label="Bỏ trống" value={result.skippedCount} tone="text-slate-600 bg-slate-100" />
      </dl>
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
  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
      <h2 className="font-bold text-foreground">Điểm theo kỹ năng</h2>
      <ul className="mt-4 space-y-4">
        {skills.map((skill) => {
          const percent = skill.total ? (skill.correct / skill.total) * 100 : 0;
          return (
            <li key={skill.skill} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <SkillPill skill={skill.skill} />
                  {skill.total > 0 && (
                    <span className="text-muted-foreground">
                      {skill.correct}/{skill.total} câu đúng
                    </span>
                  )}
                </span>
                <span className="font-bold text-foreground tabular-nums">
                  {skill.scaled === null ? (
                    <span className="font-normal text-subtle italic">Đang chờ AI chấm</span>
                  ) : scoring === 'TOEIC_990' ? (
                    `${skill.scaled} / 495`
                  ) : (
                    `${Number(skill.scaled.toFixed(2))}%`
                  )}
                </span>
              </div>
              {skill.total > 0 && (
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
