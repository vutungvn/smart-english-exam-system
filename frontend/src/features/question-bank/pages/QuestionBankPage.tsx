import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { FilePlus2, FileUp, Layers, ListChecks, Plus } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useListQuestionsQuery, type QuestionSummary } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { IMPORT_PATH } from '@/features/question-import/import-meta';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { useAppSelector } from '@/hooks/hooks';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { DeleteQuestionDialog } from '../components/DeleteQuestionDialog';
import { EmptyState, ErrorState, SuccessBanner } from '../components/ListStates';
import { QuestionFilters } from '../components/QuestionFilters';
import { QuestionTable, QuestionTableSkeleton } from '../components/QuestionTable';
import { SkillStatCards } from '../components/SkillStatCards';
import { PAGE_SIZES, toListArg, useQuestionFilters } from '../hooks/use-question-filters';

/** Trang tạo/sửa câu gửi kèm thông báo khi quay về danh sách */
export interface QuestionBankLocationState {
  flash?: string;
}

export function QuestionBankPage() {
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, update, hasFilters, clear } = useQuestionFilters();
  const { data, error, isLoading, isFetching, refetch } = useListQuestionsQuery(toListArg(filters));
  const [pendingDelete, setPendingDelete] = useState<QuestionSummary | null>(null);

  const [flash, setFlash] = useState(
    () => (location.state as QuestionBankLocationState | null)?.flash,
  );
  // Xóa state khỏi lịch sử: tải lại trang không hiện lại thông báo cũ
  useEffect(() => {
    if ((location.state as QuestionBankLocationState | null)?.flash) {
      void navigate({ search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);

  const meta = data?.meta;
  // Xóa câu cuối của trang cuối: lùi về trang có dữ liệu thay vì hiện trang rỗng
  useEffect(() => {
    if (meta && meta.totalPages > 0 && filters.page > meta.totalPages) {
      update({ page: meta.totalPages });
    }
  }, [meta, filters.page, update]);

  const questions = data?.data ?? [];
  // Đang lọc theo kỹ năng/Part thì câu mới chọn sẵn kỹ năng/Part đó
  const createSearch = new URLSearchParams();
  if (filters.skill) createSearch.set('skill', filters.skill);
  if (filters.part) createSearch.set('part', String(filters.part));
  const createPath = `/teacher/questions/new${createSearch.size ? `?${createSearch}` : ''}`;

  return (
    <div className="space-y-6">
      <title>Ngân hàng câu hỏi – Smart English Exam</title>
      <PageHeader
        title="Ngân hàng câu hỏi"
        description="Soạn và quản lý câu hỏi TOEIC 4 kỹ năng dùng để tạo đề thi."
        actions={
          <>
            <ButtonLink
              to="/teacher/question-groups"
              variant="secondary"
              className="h-10 w-auto bg-white px-4 shadow-2xs ring-1 ring-border"
            >
              <Layers />
              Nhóm câu hỏi
            </ButtonLink>
            <ButtonLink
              to={IMPORT_PATH}
              variant="secondary"
              className="h-10 w-auto bg-white px-4 shadow-2xs ring-1 ring-border"
            >
              <FileUp />
              Nhập từ tệp
            </ButtonLink>
            <ButtonLink
              to={createPath}
              className="h-10 w-auto bg-linear-to-r from-primary to-brand px-4 shadow-primary/30"
            >
              <Plus />
              Tạo câu hỏi
            </ButtonLink>
          </>
        }
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}

      <SkillStatCards selected={filters.skill} onSelect={(skill) => update({ skill })} />

      <QuestionFilters
        filters={filters}
        hasFilters={hasFilters}
        onChange={update}
        onClear={clear}
      />

      <section
        aria-label="Danh sách câu hỏi"
        className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <ListChecks className="size-5 text-primary" />
            Danh sách câu hỏi
          </h2>
          {meta && (
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{meta.total}</span> câu
            </span>
          )}
        </div>

        {isLoading ? (
          <QuestionTableSkeleton rows={Math.min(filters.limit, 6)} />
        ) : error && !data ? (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        ) : questions.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="Không có câu hỏi phù hợp"
              description="Thử bỏ bớt điều kiện lọc hoặc đổi từ khóa tìm kiếm."
            >
              <button
                type="button"
                onClick={clear}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700 hover:bg-accent"
              >
                Xóa bộ lọc
              </button>
            </EmptyState>
          ) : (
            <EmptyState
              icon={FilePlus2}
              title="Ngân hàng chưa có câu hỏi"
              description="Tạo câu hỏi đầu tiên để bắt đầu xây dựng đề thi TOEIC."
            >
              <ButtonLink to={createPath} className="h-10 w-auto px-5">
                <Plus />
                Tạo câu hỏi
              </ButtonLink>
            </EmptyState>
          )
        ) : (
          <QuestionTable
            questions={questions}
            currentUserId={user?.id}
            fetching={isFetching}
            onDelete={setPendingDelete}
          />
        )}

        {meta && meta.total > 0 && (
          <div className="border-t border-border px-5 py-4">
            <Pagination
              page={filters.page}
              totalPages={meta.totalPages}
              limit={filters.limit}
              pageSizes={PAGE_SIZES}
              onPageChange={(page) => update({ page })}
              onLimitChange={(limit) => update({ limit })}
            />
          </div>
        )}
      </section>

      <DeleteQuestionDialog
        question={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={() => {
          setPendingDelete(null);
          setFlash('Đã xóa câu hỏi');
        }}
      />
    </div>
  );
}
