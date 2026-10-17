import { Link } from 'react-router';
import { BarChart3, ClipboardList, Eye, Hourglass, Timer, X } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useListAttemptHistoryQuery, type AttemptHistoryItem } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { NativeSelect } from '@/components/form/NativeSelect';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { cn } from '@/lib/utils';
import {
  HISTORY_PAGE_SIZES,
  useHistoryFilters,
  type HistorySort,
} from '../hooks/use-history-filters';
import {
  attemptResultPath,
  attemptReviewPath,
  formatClock,
  formatDateTime,
  PRACTICE_PATH,
  practiceExamPath,
} from '../practice-meta';
import { choiceSummary, formatScore } from '../review/review-meta';

const MODE_OPTIONS = [
  { value: undefined, label: 'Tất cả' },
  { value: 'FULL', label: 'Làm cả đề' },
  { value: 'PART', label: 'Luyện theo Part' },
] as const;

/** `/app/results` (Kết quả & xem lại): các bài đã nộp, mới nhất trước */
export function AttemptHistoryPage() {
  const { filters, update, hasFilters, clear } = useHistoryFilters();
  const { data, error, isLoading, isFetching, refetch } = useListAttemptHistoryQuery(filters);
  const items = data?.data ?? [];
  const meta = data?.meta;
  // Tên đề đang lọc lấy từ chính kết quả (mọi dòng cùng một đề)
  const examTitle = filters.examId ? items[0]?.exam.title : undefined;

  return (
    <div className="space-y-6">
      <title>Kết quả & xem lại – Smart English Exam</title>
      <PageHeader
        title="Kết quả & xem lại"
        description="Các bài bạn đã nộp, mới nhất trước. Mở từng bài để xem điểm hoặc xem lại đáp án, giải thích."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label="Kiểu làm bài"
          className="flex gap-1 rounded-2xl border border-border bg-white p-1 shadow-2xs"
        >
          {MODE_OPTIONS.map((option) => {
            const active = filters.mode === option.value;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ mode: option.value })}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                  active ? 'bg-primary text-white' : 'text-slate-600 hover:bg-accent',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {filters.examId && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent py-1.5 pr-1.5 pl-3 text-sm font-semibold text-brand">
            <span className="truncate">Đề: {examTitle ?? 'đề đã chọn'}</span>
            <button
              type="button"
              aria-label="Bỏ lọc theo đề"
              onClick={() => update({ examId: undefined })}
              className="rounded-full p-1 hover:bg-white"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}

        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          Sắp xếp
          <NativeSelect
            aria-label="Sắp xếp"
            className="w-36"
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as HistorySort })}
          >
            <option value="submittedAt:desc">Mới nhất</option>
            <option value="submittedAt:asc">Cũ nhất</option>
          </NativeSelect>
        </label>
      </div>

      <section
        aria-busy={isFetching}
        className={cn(
          'rounded-3xl border border-border bg-white shadow-2xs transition-opacity',
          isFetching && !isLoading && 'opacity-60',
        )}
      >
        {isLoading ? (
          <HistorySkeleton />
        ) : error && !data ? (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="Không có bài nào khớp bộ lọc"
              description="Thử đổi kiểu làm bài hoặc bỏ lọc theo đề."
            >
              <button
                type="button"
                onClick={clear}
                className="text-sm font-semibold text-primary hover:text-brand"
              >
                Bỏ lọc
              </button>
            </EmptyState>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Bạn chưa nộp bài nào"
              description="Làm một đề hoặc luyện một Part, nộp bài xong kết quả sẽ hiện ở đây."
            >
              <ButtonLink to={PRACTICE_PATH} className="h-10 w-auto px-5">
                Luyện đề ngay
              </ButtonLink>
            </EmptyState>
          )
        ) : (
          <>
            <HistoryTable items={items} />
            <ul className="divide-y divide-border md:hidden">
              {items.map((item) => (
                <HistoryCard key={item.id} item={item} />
              ))}
            </ul>
          </>
        )}
      </section>

      {meta && meta.total > 0 && (
        <Pagination
          page={filters.page}
          totalPages={meta.totalPages}
          limit={filters.limit}
          pageSizes={HISTORY_PAGE_SIZES}
          onPageChange={(page) => update({ page })}
          onLimitChange={(limit) => update({ limit })}
        />
      )}
    </div>
  );
}

function HistoryTable({ items }: { items: AttemptHistoryItem[] }) {
  return (
    <table className="hidden w-full text-left text-sm md:table">
      <thead className="border-b border-border text-xs font-semibold tracking-wide text-subtle uppercase">
        <tr>
          <th className="px-5 py-3">Đề thi</th>
          <th className="px-3 py-3">Ngày nộp</th>
          <th className="px-3 py-3">Thời gian</th>
          <th className="px-3 py-3">Kết quả</th>
          <th className="px-5 py-3 text-right">
            <span className="sr-only">Thao tác</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((item) => (
          <tr key={item.id} className="align-top hover:bg-slate-50/60">
            <td className="max-w-80 px-5 py-4">
              <Link
                to={practiceExamPath(item.exam.id)}
                className="line-clamp-2 font-semibold text-foreground hover:text-brand"
              >
                {item.exam.title}
              </Link>
              <ModeLabel item={item} />
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-slate-700">
              {formatDateTime(item.submittedAt)}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-slate-700 tabular-nums">
              {formatClock(item.durationSeconds)}
            </td>
            <td className="px-3 py-4">
              <ResultSummary item={item} />
            </td>
            <td className="px-5 py-4">
              <Actions item={item} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HistoryCard({ item }: { item: AttemptHistoryItem }) {
  return (
    <li className="space-y-3 p-4">
      <div className="min-w-0">
        <Link
          to={practiceExamPath(item.exam.id)}
          className="font-semibold text-foreground hover:text-brand"
        >
          {item.exam.title}
        </Link>
        <ModeLabel item={item} />
      </div>
      <p className="text-xs text-subtle">
        Nộp {formatDateTime(item.submittedAt)} · Làm trong {formatClock(item.durationSeconds)}
      </p>
      <ResultSummary item={item} />
      <Actions item={item} />
    </li>
  );
}

function ModeLabel({ item }: { item: AttemptHistoryItem }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
      {item.section ? (
        <>
          <SkillPill skill={item.section.skill} />
          Luyện Part {item.section.part} · {item.section.name}
        </>
      ) : (
        'Làm cả đề'
      )}
    </p>
  );
}

function ResultSummary({ item }: { item: AttemptHistoryItem }) {
  const score = formatScore(item.result);
  return (
    <div className="space-y-1.5">
      <p className="font-bold text-foreground tabular-nums">
        {score ?? <span className="text-amber-700">Chờ AI chấm</span>}
      </p>
      <p className="text-xs text-slate-600">{choiceSummary(item.result)}</p>
      <div className="flex flex-wrap gap-1.5">
        {item.result.pendingOpenCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            <Hourglass className="size-3" />
            Speaking/Writing chờ chấm
          </span>
        )}
        {item.autoSubmitted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            <Timer className="size-3" />
            Tự nộp khi hết giờ
          </span>
        )}
      </div>
    </div>
  );
}

function Actions({ item }: { item: AttemptHistoryItem }) {
  return (
    <div className="flex gap-2 md:justify-end">
      <ButtonLink
        to={attemptReviewPath(item.id)}
        className="h-9 flex-1 px-3 text-sm md:w-auto md:flex-none"
      >
        <Eye />
        Xem lại
      </ButtonLink>
      <ButtonLink
        to={attemptResultPath(item.id)}
        variant="secondary"
        className="h-9 flex-1 bg-white px-3 text-sm ring-1 ring-border md:w-auto md:flex-none"
      >
        <BarChart3 />
        Kết quả
      </ButtonLink>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div aria-hidden className="divide-y divide-border">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-200/70" />
          <div className="hidden h-6 w-28 animate-pulse rounded bg-slate-200/70 md:block" />
          <div className="h-9 w-40 animate-pulse rounded-xl bg-slate-200/70" />
        </div>
      ))}
    </div>
  );
}
