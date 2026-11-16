import { useState } from 'react';
import { CalendarClock, ChartNoAxesColumn, ClipboardCheck, Target, Trophy } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetProgressSkillsQuery, type ProgressOverview } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { PRACTICE_PATH } from '@/features/practice/practice-meta';
import { cn } from '@/lib/utils';
import { PartAccuracyCard } from '../components/PartAccuracyCard';
import { ScoreTrendCard } from '../components/ScoreTrendCard';
import { WeakTopicsCard } from '../components/WeakTopicsCard';
import { formatPercent, formatShortDate, RANGE_LABEL, type ProgressRange } from '../progress-meta';

const RANGES: readonly ProgressRange[] = ['30d', '90d', '1y', 'all'];

/** `/app/progress`: điểm theo thời gian, tỉ lệ đúng theo Part, chủ đề cần luyện thêm */
export function ProgressPage() {
  const [range, setRange] = useState<ProgressRange>('90d');
  const { data, error, isLoading, isFetching, refetch } = useGetProgressSkillsQuery(range);
  const stats = data?.data;

  return (
    <div className="space-y-6">
      <title>Tiến độ học tập – Smart English Exam</title>
      <PageHeader
        title="Tiến độ học tập"
        description="Tính từ các bài bạn đã nộp: điểm qua từng lần làm, Part làm tốt và chủ đề cần luyện thêm."
        actions={
          <div
            role="radiogroup"
            aria-label="Khoảng thời gian"
            className="flex rounded-2xl border border-border bg-white p-1 shadow-2xs"
          >
            {RANGES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={range === value}
                onClick={() => setRange(value)}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                  range === value ? 'bg-primary text-white' : 'text-slate-600 hover:bg-accent',
                )}
              >
                {RANGE_LABEL[value]}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <ProgressSkeleton />
      ) : error && !stats ? (
        <div className="rounded-3xl border border-border bg-white">
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        </div>
      ) : stats && stats.overview.submittedCount === 0 ? (
        <div className="rounded-3xl border border-border bg-white">
          <EmptyState
            icon={ChartNoAxesColumn}
            title={
              range === 'all'
                ? 'Chưa có dữ liệu tiến độ'
                : `Chưa có bài nộp trong ${RANGE_LABEL[range].toLowerCase()}`
            }
            description="Làm và nộp bài (cả đề hoặc luyện từng Part), tiến độ sẽ hiện ở đây."
          >
            <ButtonLink to={PRACTICE_PATH} className="h-10 w-auto px-5">
              Luyện đề ngay
            </ButtonLink>
            {range !== 'all' && (
              <button
                type="button"
                onClick={() => setRange('all')}
                className="text-sm font-semibold text-primary hover:text-brand"
              >
                Xem toàn bộ
              </button>
            )}
          </EmptyState>
        </div>
      ) : (
        stats && (
          <div className={cn('space-y-6 transition-opacity', isFetching && 'opacity-60')}>
            <OverviewTiles overview={stats.overview} />
            <ScoreTrendCard
              title="Điểm qua các lần làm bài"
              description="Mỗi điểm là một bài đã nộp; rê chuột (hoặc chạm) để xem chi tiết."
              range={range}
            />
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              {stats.skills.length > 0 ? (
                <PartAccuracyCard skills={stats.skills} parts={stats.parts} />
              ) : (
                <section className="rounded-3xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-2xs">
                  Các bài đã nộp chưa có câu trắc nghiệm nào (chỉ Speaking/Writing).
                </section>
              )}
              <WeakTopicsCard data={stats} />
            </div>
          </div>
        )
      )}
    </div>
  );
}

function OverviewTiles({ overview }: { overview: ProgressOverview }) {
  const last = overview.lastSubmittedAt ? new Date(overview.lastSubmittedAt) : null;
  const tiles = [
    {
      icon: ClipboardCheck,
      label: 'Bài đã nộp',
      value: `${overview.submittedCount}`,
      note: `${overview.fullCount} cả đề · ${overview.partCount} luyện Part`,
    },
    {
      icon: Target,
      label: 'Tỉ lệ đúng',
      value: formatPercent(overview.accuracy),
      note: `${overview.choiceCorrect}/${overview.choiceTotal} câu trắc nghiệm`,
    },
    {
      icon: Trophy,
      label: 'Điểm TOEIC LR cao nhất',
      value: overview.bestToeicScore === null ? '—' : `${overview.bestToeicScore}`,
      note:
        overview.latestToeicScore === null
          ? 'Làm một đề TOEIC LR đầy đủ để có điểm'
          : `Gần nhất ${overview.latestToeicScore} / 990`,
    },
    {
      icon: CalendarClock,
      label: 'Lần nộp gần nhất',
      value: last ? formatShortDate(last.toISOString()) : '—',
      note: last
        ? `${last.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${last.getFullYear()}`
        : '',
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
      {tiles.map(({ icon: Icon, label, value, note }) => (
        <li
          key={label}
          className="rounded-[20px] border border-border bg-white p-4 shadow-2xs sm:p-5"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
            <Icon className="size-5" />
          </span>
          <p className="mt-3 text-xs font-semibold text-subtle sm:text-sm">{label}</p>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl">
            {value}
          </p>
          {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
        </li>
      ))}
    </ul>
  );
}

function ProgressSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-[20px] border border-border bg-white"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-3xl border border-border bg-white" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-white" />
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-white" />
      </div>
    </div>
  );
}
