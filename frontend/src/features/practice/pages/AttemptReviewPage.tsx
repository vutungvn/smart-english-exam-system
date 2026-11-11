import { useState } from 'react';
import { flushSync } from 'react-dom';
import { useParams } from 'react-router';
import {
  BarChart3,
  CircleSlash,
  FileQuestion,
  History,
  LayoutGrid,
  ListRestart,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetAttemptReviewQuery, type AttemptReview, type ReviewSection } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import {
  attemptPath,
  attemptResultPath,
  formatDateTime,
  practiceExamPath,
  RESULTS_PATH,
} from '../practice-meta';
import { ReviewBlockView } from '../review/ReviewBlockView';
import { ReviewNavigator } from '../review/ReviewNavigator';
import {
  choiceSummary,
  formatScore,
  GRADING_POLL_MS,
  hasChoice,
  isGrading,
  matchesFilter,
  REVIEW_FILTERS,
  scoreLabel,
  type ReviewFilter,
} from '../review/review-meta';

/** `/app/attempts/:id/review`: đáp án, giải thích từng câu của bài đã nộp */
export function AttemptReviewPage() {
  const { id = '' } = useParams();
  const [polling, setPolling] = useState(false);
  // Luôn lấy bản mới: giáo viên có thể vừa sửa giải thích. Còn câu Speaking/Writing đang chấm (kể cả vừa bấm
  // "Chấm lại") thì hỏi lại mỗi 5 giây tới khi chấm xong
  const { data, error, isLoading, refetch } = useGetAttemptReviewQuery(id, {
    refetchOnMountOrArgChange: true,
    pollingInterval: polling ? GRADING_POLL_MS : 0,
    skipPollingIfUnfocused: true,
  });
  const grading = isGrading(data?.data.result);
  if (grading !== polling) setPolling(grading);

  if (isLoading) return <ReviewSkeleton />;
  if (!data) {
    const apiError = toApiError(error);
    return (
      <div className="rounded-3xl border border-border bg-white">
        {apiError.code === 'ATTEMPT_NOT_SUBMITTED' ? (
          apiError.message.includes('hủy') ? (
            <EmptyState
              icon={CircleSlash}
              title="Bài làm đã hủy"
              description="Bài này đã hủy nên không có đáp án để xem lại."
            >
              <ButtonLink to={RESULTS_PATH} className="h-10 w-auto px-5">
                Về lịch sử làm bài
              </ButtonLink>
            </EmptyState>
          ) : (
            <EmptyState
              icon={FileQuestion}
              title="Bài làm chưa nộp"
              description="Đáp án và giải thích hiện ngay sau khi bạn nộp bài."
            >
              <ButtonLink to={attemptPath(id)} className="h-10 w-auto px-5">
                Làm tiếp bài
              </ButtonLink>
            </EmptyState>
          )
        ) : apiError.code === 'ATTEMPT_NOT_FOUND' ? (
          <EmptyState
            icon={FileQuestion}
            title="Không tìm thấy bài làm"
            description="Bài làm không tồn tại hoặc không phải của bạn."
          >
            <ButtonLink to={RESULTS_PATH} className="h-10 w-auto px-5">
              Về lịch sử làm bài
            </ButtonLink>
          </EmptyState>
        ) : (
          <ErrorState message={apiError.message} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  return <ReviewContent key={data.data.id} review={data.data} />;
}

function ReviewContent({ review }: { review: AttemptReview }) {
  const [filter, setFilter] = useState<ReviewFilter>('ALL');
  const [navOpen, setNavOpen] = useState(false);
  const all = review.sections.flatMap((section) => section.blocks.flatMap((b) => b.questions));
  const counts = Object.fromEntries(
    REVIEW_FILTERS.map(({ value }) => [value, all.filter((q) => matchesFilter(q, value)).length]),
  ) as Record<ReviewFilter, number>;
  const visibleSections = review.sections
    .map((section) => ({
      section,
      blocks: section.blocks
        .map((block) => ({
          block,
          questions: block.questions.filter((q) => matchesFilter(q, filter)),
        }))
        .filter((item) => item.questions.length > 0),
    }))
    .filter((item) => item.blocks.length > 0);

  /** Bảng câu hỏi: câu đang bị bộ lọc ẩn thì chuyển về "Tất cả" trước khi cuộn tới */
  const jump = (examQuestionId: string) => {
    const question = all.find((q) => q.examQuestionId === examQuestionId);
    flushSync(() => {
      if (question && !matchesFilter(question, filter)) setFilter('ALL');
      setNavOpen(false);
    });
    const target = document.getElementById(`q-${examQuestionId}`);
    if (!target) return;
    // Câu ở xa thì nhảy thẳng ('instant': trang đặt CSS scroll-behavior smooth nên 'auto' vẫn cuộn mượt): cuộn mượt qua cả đề vừa chậm vừa làm ảnh tải chậm (lazy) ở giữa
    // đường nạp vào, đẩy câu cần tới lệch khỏi vị trí
    const far = Math.abs(target.getBoundingClientRect().top) > window.innerHeight * 2;
    target.scrollIntoView({ behavior: far ? 'instant' : 'smooth', block: 'start' });
  };

  const { result } = review;
  const score = formatScore(result);
  const choice = hasChoice(result);
  const subtitle = review.section
    ? `Luyện Part ${review.section.part} · ${review.section.name}`
    : 'Làm cả đề';

  return (
    <div className="space-y-6">
      <title>{`Xem lại – ${review.exam.title}`}</title>
      <PageHeader
        breadcrumbs={[
          { label: 'Kết quả & xem lại', to: RESULTS_PATH },
          { label: review.exam.title, to: practiceExamPath(review.exam.id) },
          { label: 'Xem lại đáp án' },
        ]}
        title="Xem lại đáp án"
        description={`${review.exam.title} · ${subtitle} · Nộp lúc ${formatDateTime(result.submittedAt)}`}
        actions={
          <>
            <ButtonLink
              to={attemptResultPath(review.id)}
              variant="secondary"
              className="h-10 w-auto bg-white px-4 shadow-2xs ring-1 ring-border"
            >
              <BarChart3 />
              Kết quả
            </ButtonLink>
            <ButtonLink to={practiceExamPath(review.exam.id)} className="h-10 w-auto px-4">
              <ListRestart />
              Làm lại đề
            </ButtonLink>
          </>
        }
      />

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="min-w-0 sm:w-48 sm:shrink-0">
          <p className="text-xs font-semibold text-subtle">{scoreLabel(result)}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {score ?? <span className="text-base font-semibold text-amber-700">Chờ AI chấm</span>}
          </p>
          <p className="text-xs text-muted-foreground">{choiceSummary(result)}</p>
        </div>
        <dl className="grid flex-1 grid-cols-4 gap-2">
          {choice ? (
            <>
              <Stat
                label="Đúng"
                value={totalOf(review.sections, 'correct')}
                tone="bg-emerald-50 text-success"
              />
              <Stat
                label="Sai"
                value={totalOf(review.sections, 'wrong')}
                tone="bg-danger-soft text-destructive"
              />
            </>
          ) : (
            <>
              <Stat
                label="Đã chấm"
                value={totalOf(review.sections, 'scored')}
                tone="bg-sky-50 text-sky-700"
              />
              <Stat
                label="Chấm lỗi"
                value={totalOf(review.sections, 'failed')}
                tone="bg-rose-50 text-rose-700"
              />
            </>
          )}
          <Stat
            label="Bỏ trống"
            value={totalOf(review.sections, 'skipped')}
            tone="bg-slate-100 text-slate-600"
          />
          <Stat
            label="Chờ chấm"
            value={totalOf(review.sections, 'pending')}
            tone="bg-amber-50 text-amber-700"
          />
        </dl>
      </section>

      <div
        role="radiogroup"
        aria-label="Lọc câu hỏi"
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
      >
        {REVIEW_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
              filter === value
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white text-slate-700 hover:border-primary/40',
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs tabular-nums',
                filter === value ? 'bg-white/20' : 'bg-slate-100 text-slate-600',
              )}
            >
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* pb-20 trên màn hẹp: chừa chỗ cho nút "Bảng câu hỏi" nổi ở góc dưới */}
      <div className="grid items-start gap-6 pb-20 lg:grid-cols-[minmax(0,1fr)_260px] lg:pb-0">
        <div className="min-w-0 space-y-8">
          {visibleSections.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-white">
              <EmptyState
                icon={FileQuestion}
                title="Không có câu nào"
                description={`Không có câu nào ở mục "${REVIEW_FILTERS.find((f) => f.value === filter)?.label}".`}
              >
                <button
                  type="button"
                  onClick={() => setFilter('ALL')}
                  className="text-sm font-semibold text-primary hover:text-brand"
                >
                  Xem tất cả câu
                </button>
              </EmptyState>
            </div>
          ) : (
            visibleSections.map(({ section, blocks }) => (
              <section key={section.id} aria-label={`Part ${section.part}`} className="space-y-4">
                <h2 className="text-lg font-bold text-foreground">
                  {section.skill.charAt(0) + section.skill.slice(1).toLowerCase()} · Part{' '}
                  {section.part} · {section.name}
                </h2>
                {blocks.map(({ block, questions }, index) => (
                  <ReviewBlockView
                    key={block.group?.id ?? block.questions[0]?.examQuestionId ?? index}
                    attemptId={review.id}
                    block={block}
                    questions={questions}
                  />
                ))}
              </section>
            ))
          )}
        </div>

        <aside className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] space-y-4 overflow-y-auto rounded-3xl border border-border bg-white p-5 shadow-2xs lg:block">
          <h2 className="font-bold text-foreground">Bảng câu hỏi</h2>
          <ReviewNavigator sections={review.sections} onJump={jump} />
          <ButtonLink
            to={RESULTS_PATH}
            variant="ghost"
            className="h-9 w-full justify-start px-2 text-sm text-slate-600"
          >
            <History />
            Lịch sử làm bài
          </ButtonLink>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setNavOpen(true)}
        className="fixed right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-lg ring-1 ring-border lg:hidden"
      >
        <LayoutGrid className="size-4 text-primary" />
        Bảng câu hỏi · {review.totalQuestions} câu
      </button>

      <AppDialog
        open={navOpen}
        onOpenChange={setNavOpen}
        title="Bảng câu hỏi"
        description="Bấm vào số câu để chuyển tới câu đó."
        footer={
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            onClick={() => setNavOpen(false)}
          >
            Đóng
          </Button>
        }
      >
        <ReviewNavigator sections={review.sections} onJump={jump} />
      </AppDialog>
    </div>
  );
}

function totalOf(sections: ReviewSection[], key: keyof ReviewSection['counts']): number {
  return sections.reduce((sum, section) => sum + section.counts[key], 0);
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn('rounded-2xl px-1 py-2.5 text-center sm:px-3', tone)}>
      <dt className="text-[11px] font-semibold whitespace-nowrap sm:text-xs">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-56 animate-pulse rounded bg-slate-200/70" />
        <div className="h-8 w-72 animate-pulse rounded bg-slate-200/70" />
      </div>
      <div className="h-28 animate-pulse rounded-3xl border border-border bg-white" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl border border-border bg-white" />
          ))}
        </div>
        <div className="hidden h-80 animate-pulse rounded-3xl border border-border bg-white lg:block" />
      </div>
    </div>
  );
}
