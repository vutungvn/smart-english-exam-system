import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { FileSearch } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useListInProgressAttemptsQuery,
  useListPublishedExamsQuery,
  type ScoringScale,
  type Skill,
} from '@/api/generated';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { SearchInput } from '@/features/exams/components/SearchInput';
import { FilterSelect, SegmentedControl } from '@/features/question-bank/components/FilterControls';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { SKILL_META, SKILLS } from '@/features/question-bank/toeic';
import { cn } from '@/lib/utils';
import { ContinueBanner } from '../components/ContinueBanner';
import { ExamCatalogCard } from '../components/ExamCatalogCard';
import { SCALE_META, SCALE_OPTIONS } from '../practice-meta';

const PAGE_SIZES = [9, 18, 36] as const;

/** Trang "Luyện đề thi": đề đã xuất bản, bài đang làm dở */
export function PracticeExamsPage() {
  // Mở từ nút "Luyện ngay" (?skill=READING) thì lọc sẵn theo kỹ năng
  const [params] = useSearchParams();
  const [skill, setSkill] = useState<Skill | undefined>(() =>
    SKILLS.find((item) => item === params.get('skill')),
  );
  const [scale, setScale] = useState<ScoringScale>();
  const [q, setQ] = useState<string>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(PAGE_SIZES[0]);

  const { data, error, isLoading, isFetching, refetch } = useListPublishedExamsQuery({
    skill,
    scoringScale: scale,
    q,
    page,
    limit,
  });
  const inProgress = useListInProgressAttemptsQuery();
  const exams = data?.data ?? [];
  const meta = data?.meta;
  const latest = inProgress.data?.data[0];
  const filtered = Boolean(skill || scale || q);

  // Đổi bộ lọc thì về trang 1
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <title>Luyện đề thi – Smart English Exam</title>
      <PageHeader
        title="Luyện đề thi"
        description="Chọn đề để làm cả đề có tính giờ, hoặc luyện riêng từng Part không tính giờ."
      />

      {latest && <ContinueBanner attempt={latest} />}

      <section
        aria-label="Bộ lọc đề"
        className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-5 xl:flex-row xl:items-center"
      >
        <SegmentedControl<Skill>
          label="Kỹ năng"
          value={skill}
          onChange={(value) => filter(() => setSkill(value))}
          options={[
            { label: 'Tất cả' },
            ...SKILLS.map((item) => ({ value: item, label: SKILL_META[item].label })),
          ]}
          className="grid grid-cols-3 sm:flex xl:shrink-0"
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px] xl:flex-1">
          <SearchInput
            value={q}
            onSearch={(value) => filter(() => setQ(value))}
            placeholder="Tìm theo tên đề…"
          />
          <div className="[&>div>label]:sr-only">
            <FilterSelect
              label="Loại đề"
              value={scale ?? ''}
              placeholder="Mọi loại đề"
              onChange={(value) => filter(() => setScale((value || undefined) as ScoringScale))}
            >
              {SCALE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {SCALE_META[item].label}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
        {meta && (
          <p className="text-sm whitespace-nowrap text-muted-foreground xl:ml-2">
            <span className="font-semibold text-foreground">{meta.total}</span> đề
          </p>
        )}
      </section>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : error && !data ? (
        <div className="rounded-3xl border border-border bg-white">
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-3xl border border-border bg-white">
          <EmptyState
            icon={FileSearch}
            title={filtered ? 'Không có đề phù hợp' : 'Chưa có đề nào'}
            description={
              filtered
                ? 'Thử bỏ bớt điều kiện lọc hoặc đổi từ khóa.'
                : 'Giáo viên chưa xuất bản đề thi nào. Hãy quay lại sau nhé.'
            }
          />
        </div>
      ) : (
        <div
          aria-busy={isFetching}
          className={cn(
            'grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3',
            isFetching && 'opacity-60',
          )}
        >
          {exams.map((exam) => (
            <ExamCatalogCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}

      {meta && meta.total > limit && (
        <div className="rounded-3xl border border-border bg-white px-5 py-4 shadow-2xs">
          <Pagination
            page={page}
            totalPages={meta.totalPages}
            limit={limit}
            pageSizes={PAGE_SIZES}
            onPageChange={setPage}
            onLimitChange={(value) => filter(() => setLimit(value))}
          />
        </div>
      )}
    </div>
  );
}
