import { Link, useSearchParams } from 'react-router';
import { ChevronRight, ClipboardCheck, Inbox, UserCheck } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useListTeacherAssessmentsQuery, type TeacherReviewItem } from '@/api/generated';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { formatDateTime } from '@/features/practice/practice-meta';
import { FilterSelect, SegmentedControl } from '@/features/question-bank/components/FilterControls';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import {
  GRADING_PAGE_SIZES,
  gradingDetailPath,
  questionLabel,
  REASON_META,
  SKILL_LABELS,
  type GradingScope,
  type GradingTab,
  type OpenSkill,
} from '../grading-meta';

/** Bộ lọc nằm trên URL: tải lại trang, quay lại từ màn chấm vẫn giữ nguyên */
function useGradingFilters() {
  const [params, setParams] = useSearchParams();
  const filters = {
    tab: (params.get('tab') === 'REVIEWED' ? 'REVIEWED' : 'WAITING') as GradingTab,
    scope: (params.get('scope') === 'MINE' ? 'MINE' : 'ALL') as GradingScope,
    skill: (['SPEAKING', 'WRITING'].includes(params.get('skill') ?? '')
      ? params.get('skill')
      : undefined) as OpenSkill | undefined,
    page: Math.max(1, Number(params.get('page')) || 1),
    limit: GRADING_PAGE_SIZES.includes(Number(params.get('limit')) as 10)
      ? Number(params.get('limit'))
      : GRADING_PAGE_SIZES[1],
  };
  const update = (patch: Partial<typeof filters>) => {
    const next = { ...filters, page: 1, ...patch };
    const search = new URLSearchParams();
    if (next.tab !== 'WAITING') search.set('tab', next.tab);
    if (next.scope !== 'ALL') search.set('scope', next.scope);
    if (next.skill) search.set('skill', next.skill);
    if (next.page > 1) search.set('page', String(next.page));
    if (next.limit !== GRADING_PAGE_SIZES[1]) search.set('limit', String(next.limit));
    setParams(search, { replace: true });
  };
  return { filters, update };
}

/**
 * Hàng đợi "Chấm lại bài" của giáo viên (SPRINT-91): câu Speaking/Writing AI chấm lỗi hoặc học viên
 * yêu cầu chấm lại; mọi giáo viên chấm được mọi đề, lọc "Đề của tôi" khi cần
 */
export function GradingQueuePage() {
  const { filters, update } = useGradingFilters();
  const { data, error, isLoading, isFetching, refetch } = useListTeacherAssessmentsQuery(filters, {
    refetchOnMountOrArgChange: true,
  });
  const items = data?.data ?? [];
  const meta = data?.meta;
  const waiting = filters.tab === 'WAITING';

  return (
    <div className="space-y-6">
      <title>Chấm lại bài – Smart English Exam</title>
      <PageHeader
        title="Chấm lại bài"
        description="Câu Speaking/Writing AI chấm lỗi hoặc học viên yêu cầu giáo viên chấm lại. Điểm giáo viên là điểm chính thức, thay cho điểm AI."
      />

      <section
        aria-label="Bộ lọc"
        className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-5 lg:flex-row lg:items-end"
      >
        <SegmentedControl<GradingTab>
          label="Trạng thái"
          value={filters.tab}
          onChange={(tab) => update({ tab: tab ?? 'WAITING' })}
          options={[
            { value: 'WAITING', label: 'Chờ chấm' },
            { value: 'REVIEWED', label: 'Đã chấm' },
          ]}
          className="grid grid-cols-2 sm:flex lg:shrink-0"
        />
        <SegmentedControl<GradingScope>
          label="Phạm vi đề"
          value={filters.scope}
          onChange={(scope) => update({ scope: scope ?? 'ALL' })}
          options={[
            { value: 'ALL', label: 'Mọi đề' },
            { value: 'MINE', label: 'Đề của tôi' },
          ]}
          className="grid grid-cols-2 sm:flex lg:shrink-0"
        />
        <div className="sm:w-56 [&>div>label]:sr-only">
          <FilterSelect
            label="Kỹ năng"
            value={filters.skill ?? ''}
            placeholder="Speaking và Writing"
            onChange={(value) => update({ skill: (value || undefined) as OpenSkill | undefined })}
          >
            {(['SPEAKING', 'WRITING'] as const).map((skill) => (
              <option key={skill} value={skill}>
                {SKILL_LABELS[skill]}
              </option>
            ))}
          </FilterSelect>
        </div>
      </section>

      <section
        aria-label="Danh sách câu"
        aria-busy={isFetching}
        className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <ClipboardCheck className="size-5 text-primary" />
            {waiting ? 'Câu chờ giáo viên chấm' : 'Câu đã chấm'}
          </h2>
          {meta && (
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{meta.total}</span> câu
            </span>
          )}
        </div>

        {isLoading ? (
          <ul aria-hidden className="divide-y divide-border">
            {[0, 1, 2, 3].map((key) => (
              <li key={key} className="px-5 py-4">
                <div className="h-14 animate-pulse rounded-xl bg-background" />
              </li>
            ))}
          </ul>
        ) : error && !data ? (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={waiting ? 'Không có câu nào chờ chấm' : 'Chưa chấm câu nào'}
            description={
              waiting
                ? 'Câu AI chấm lỗi hoặc học viên yêu cầu chấm lại sẽ hiện ở đây.'
                : 'Các câu giáo viên đã chấm lại sẽ hiện ở đây.'
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <QueueRow key={item.answerId} item={item} />
            ))}
          </ul>
        )}
      </section>

      {meta && meta.total > 0 && (
        <Pagination
          page={filters.page}
          totalPages={meta.totalPages}
          limit={filters.limit}
          pageSizes={GRADING_PAGE_SIZES}
          onPageChange={(page) => update({ page })}
          onLimitChange={(limit) => update({ limit })}
        />
      )}
    </div>
  );
}

function QueueRow({ item }: { item: TeacherReviewItem }) {
  const reviewed = item.teacherScore !== null;
  return (
    <li>
      <Link
        to={gradingDetailPath(item.answerId)}
        className="flex flex-col gap-3 px-5 py-4 outline-none hover:bg-accent/40 focus-visible:bg-accent sm:flex-row sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.reasons.map((reason) => (
              <span
                key={reason}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  REASON_META[reason].className,
                )}
              >
                {REASON_META[reason].label}
              </span>
            ))}
            {item.isMyExam && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary">
                Đề của tôi
              </span>
            )}
          </div>
          <p className="mt-1 truncate font-semibold text-foreground">{item.examTitle}</p>
          <p className="text-sm text-muted-foreground">
            {questionLabel(item.skill, item.part, item.questionNumber)} · {item.studentCode} · nộp{' '}
            {formatDateTime(item.submittedAt)}
          </p>
          {item.requestNote && (
            <p className="mt-1 line-clamp-2 text-sm text-violet-800 italic">“{item.requestNote}”</p>
          )}
        </div>
        <div className="flex items-center gap-4 sm:shrink-0">
          <div className="text-right text-sm tabular-nums">
            <p className="text-muted-foreground">
              AI:{' '}
              <span className="font-semibold text-foreground">
                {item.aiScore === null ? '—' : `${item.aiScore}/${item.maxScore}`}
              </span>
            </p>
            {reviewed && (
              <p className="flex items-center justify-end gap-1 text-violet-700">
                <UserCheck className="size-3.5" />
                <span className="font-semibold">
                  {item.teacherScore}/{item.maxScore}
                </span>
                {item.reviewerName && <span className="truncate">· {item.reviewerName}</span>}
              </p>
            )}
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary sm:ml-0">
            {reviewed ? 'Xem' : 'Chấm'}
            <ChevronRight className="size-4" />
          </span>
        </div>
      </Link>
    </li>
  );
}
