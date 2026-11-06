import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { Eye, FilePlus2, MoreVertical, PencilRuler, Plus, Trash2 } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useBulkDeleteExamsMutation,
  useCreateExamMutation,
  useDeleteExamMutation,
  useListExamsQuery,
  useListSubjectsQuery,
  type ExamStatus,
  type ExamSummary,
  type ScoringScale,
} from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { BulkActionBar } from '@/components/bulk/BulkActionBar';
import { BulkDeleteDialog } from '@/components/bulk/BulkDeleteDialog';
import { toOutcome, type BulkOutcome } from '@/components/bulk/bulk-outcome';
import { BulkResultBanner } from '@/components/bulk/BulkResultBanner';
import { SelectCheckbox } from '@/components/bulk/SelectCheckbox';
import { useSelection, type Selection } from '@/components/bulk/use-selection';
import { FormAlert } from '@/components/form/FormAlert';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/features/profile/format';
import { FilterSelect, SegmentedControl } from '@/features/question-bank/components/FilterControls';
import {
  EmptyState,
  ErrorState,
  SuccessBanner,
} from '@/features/question-bank/components/ListStates';
import { QuestionTableSkeleton } from '@/features/question-bank/components/QuestionTable';
import { cn } from '@/lib/utils';
import { ExamFormDialog } from '../components/ExamFormDialog';
import { ExamStatusPill, ExamTypePill } from '../components/ExamPills';
import { SearchInput } from '../components/SearchInput';
import {
  EXAM_STATUS_META,
  EXAM_STATUSES,
  EXAM_TYPE_META,
  expectedTotal,
  SCALES,
} from '../exam-meta';
import { EXAM_PAGE_SIZES, toExamListArg, useExamFilters } from '../hooks/use-exam-filters';
import { examPath, examPreviewPath } from '../paths';

export interface ExamsLocationState {
  flash?: string;
}

export function ExamsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, update, hasFilters, clear } = useExamFilters();
  const { data, error, isLoading, isFetching, refetch } = useListExamsQuery(toExamListArg(filters));
  const subjects = useListSubjectsQuery();
  const toeicId = subjects.data?.data.find((subject) => subject.code === 'TOEIC')?.id;
  const [createExam] = useCreateExamMutation();
  const [deleteExam, { isLoading: deleting }] = useDeleteExamMutation();
  const [creating, setCreating] = useState(0); // đổi key để mở hộp thoại với form mới
  const [pendingDelete, setPendingDelete] = useState<ExamSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  // Chọn nhiều để xóa: đổi bộ lọc/trang thì bỏ chọn
  const selection = useSelection(JSON.stringify(filters));
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string>();
  const [outcome, setOutcome] = useState<BulkOutcome>();
  const [bulkDelete, { isLoading: bulkDeleting }] = useBulkDeleteExamsMutation();

  const [flash, setFlash] = useState(() => (location.state as ExamsLocationState | null)?.flash);
  useEffect(() => {
    if ((location.state as ExamsLocationState | null)?.flash) {
      void navigate({ search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);

  // Xóa đề cuối của trang cuối: lùi về trang còn dữ liệu
  const meta = data?.meta;
  useEffect(() => {
    if (meta && meta.totalPages > 0 && filters.page > meta.totalPages) {
      update({ page: meta.totalPages });
    }
  }, [meta, filters.page, update]);

  const exams = data?.data ?? [];
  const openCreate = () => setCreating((n) => n + 1);

  const confirmBulk = async () => {
    setBulkError(undefined);
    try {
      const { data: result } = await bulkDelete({ ids: [...selection.ids] }).unwrap();
      setBulkOpen(false);
      selection.clear();
      setFlash(undefined);
      setOutcome(toOutcome(result, 'đề thi'));
    } catch (err) {
      setBulkError(toApiError(err).message);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError(undefined);
    try {
      await deleteExam(pendingDelete.id).unwrap();
      setPendingDelete(null);
      setFlash('Đã xóa đề thi');
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'EXAM_NOT_FOUND') {
        setPendingDelete(null);
        return;
      }
      setDeleteError(apiError.message);
    }
  };

  return (
    <div className="space-y-6">
      <title>Đề thi – Smart English Exam</title>
      <PageHeader
        title="Đề thi"
        description="Soạn đề từ ngân hàng câu hỏi, kiểm tra cấu trúc và xuất bản cho học viên."
        actions={
          <Button
            type="button"
            onClick={openCreate}
            disabled={!toeicId}
            className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-4 font-semibold shadow-md shadow-primary/30 hover:brightness-95"
          >
            <Plus />
            Tạo đề thi
          </Button>
        }
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}
      {outcome && <BulkResultBanner outcome={outcome} onClose={() => setOutcome(undefined)} />}

      <section
        aria-label="Bộ lọc đề thi"
        className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-5 xl:flex-row xl:items-center"
      >
        <SegmentedControl<ExamStatus>
          label="Trạng thái"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={[
            { label: 'Tất cả' },
            ...EXAM_STATUSES.map((item) => ({ value: item, label: EXAM_STATUS_META[item].label })),
          ]}
          className="grid grid-cols-2 sm:flex xl:shrink-0"
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] xl:flex-1">
          <SearchInput
            value={filters.q}
            onSearch={(q) => update({ q })}
            placeholder="Tìm theo tên đề…"
          />
          <div className="[&>div>label]:sr-only">
            <FilterSelect
              label="Loại đề"
              value={filters.scoringScale ?? ''}
              placeholder="Mọi loại đề"
              onChange={(value) =>
                update({ scoringScale: (value || undefined) as ScoringScale | undefined })
              }
            >
              {SCALES.map((item) => (
                <option key={item} value={item}>
                  {EXAM_TYPE_META[item].title}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
      </section>

      <section
        aria-label="Danh sách đề"
        className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <PencilRuler className="size-5 text-primary" />
            Danh sách đề
          </h2>
          {meta && (
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{meta.total}</span> đề
            </span>
          )}
        </div>

        {isLoading ? (
          <QuestionTableSkeleton rows={4} />
        ) : error && !data ? (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        ) : exams.length === 0 ? (
          hasFilters ? (
            <EmptyState title="Không có đề phù hợp" description="Thử bỏ bớt điều kiện lọc.">
              <Button variant="outline" className="h-10 rounded-xl px-4" onClick={clear}>
                Xóa bộ lọc
              </Button>
            </EmptyState>
          ) : (
            <EmptyState
              icon={FilePlus2}
              title="Chưa có đề thi nào"
              description="Tạo đề, thêm các Part rồi chọn câu từ ngân hàng câu hỏi."
            >
              <Button className="h-10 rounded-xl px-5" onClick={openCreate} disabled={!toeicId}>
                <Plus />
                Tạo đề thi
              </Button>
            </EmptyState>
          )
        ) : (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            {/* Bảng từ md trở lên; màn hẹp hiện dạng thẻ để không phải cuộn ngang */}
            <ExamTable exams={exams} onDelete={setPendingDelete} selection={selection} />
            <div className="md:hidden">
              <SelectPageRow exams={exams} selection={selection} />
              <ul className="divide-y divide-border">
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onDelete={() => setPendingDelete(exam)}
                    selection={selection}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}

        {meta && meta.total > 0 && (
          <div className="border-t border-border px-5 py-4">
            <Pagination
              page={filters.page}
              totalPages={meta.totalPages}
              limit={filters.limit}
              pageSizes={EXAM_PAGE_SIZES}
              onPageChange={(page) => update({ page })}
              onLimitChange={(limit) => update({ limit })}
            />
          </div>
        )}
      </section>

      <BulkActionBar
        count={selection.count}
        noun="đề"
        onClear={selection.clear}
        onDelete={() => {
          setBulkError(undefined);
          setBulkOpen(true);
        }}
      />

      <BulkDeleteDialog
        open={bulkOpen}
        count={selection.count}
        noun="đề thi"
        description="Đề bị xóa không còn trong danh sách. Bài làm cũ của học viên (nếu có) vẫn được giữ. Đề đang xuất bản sẽ được bỏ qua."
        busy={bulkDeleting}
        error={bulkError}
        onClose={() => setBulkOpen(false)}
        onConfirm={() => void confirmBulk()}
      />

      {creating > 0 && toeicId && (
        <ExamFormDialog
          key={creating}
          open
          onOpenChange={(open) => !open && setCreating(0)}
          onSubmit={async (values) => {
            const { data: created } = await createExam({
              subjectId: toeicId,
              title: values.title,
              description: values.description || null,
              scoringScale: values.scoringScale,
              durationMinutes: values.durationMinutes,
              maxAttempts: values.maxAttempts,
              allowPartPractice: values.allowPartPractice,
              shuffleQuestions: values.shuffleQuestions,
            }).unwrap();
            const state: ExamsLocationState = {
              flash: 'Đã tạo đề, hãy thêm các Part và câu hỏi',
            };
            void navigate(examPath(created.id), { state });
          }}
        />
      )}

      <AppDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setDeleteError(undefined);
          }
        }}
        busy={deleting}
        title="Xóa đề thi?"
        description="Đề sẽ không còn trong danh sách. Bài làm cũ của học viên (nếu có) vẫn được giữ."
        footer={
          <>
            <Button
              variant="outline"
              className="h-10 rounded-xl px-4"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              Hủy
            </Button>
            <Button
              className="h-10 rounded-xl bg-destructive px-4 text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              <Trash2 />
              {deleting ? 'Đang xóa…' : 'Xóa đề'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-xl border-l-4 border-destructive/50 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            {pendingDelete?.title}
          </p>
          {deleteError && (
            <FormAlert message={deleteError} onClose={() => setDeleteError(undefined)} />
          )}
        </div>
      </AppDialog>
    </div>
  );
}

/**
 * "7 Part · 194/200 câu" kèm thanh tiến độ với đề LR. Danh sách không có chi tiết phần thi
 * nên đề Speaking/Writing và đề luyện tập chỉ ghi số câu; số chuẩn xem ở màn soạn đề.
 */
function Structure({ exam }: { exam: ExamSummary }) {
  const expected = expectedTotal(exam);
  const done = expected !== null && exam.questionCount === expected;
  const percent = expected ? Math.min(100, Math.round((exam.questionCount / expected) * 100)) : 0;
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold whitespace-nowrap text-foreground">
        {exam.sectionCount} Part ·{' '}
        <span className={cn(expected && !done && 'text-amber-600')}>
          {expected ? `${exam.questionCount}/${expected}` : exam.questionCount} câu
        </span>
      </p>
      {expected ? (
        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full', done ? 'bg-success' : 'bg-amber-400')}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Đề đang xuất bản không xóa được: ô chọn bị khóa */
const PUBLISHED_REASON = 'Gỡ xuất bản trước khi xóa';

function deletableIds(exams: ExamSummary[]): string[] {
  return exams.filter((exam) => exam.status !== 'PUBLISHED').map((exam) => exam.id);
}

/** Ô "chọn cả trang" cho dạng thẻ trên màn hẹp */
function SelectPageRow({ exams, selection }: { exams: ExamSummary[]; selection: Selection }) {
  const ids = deletableIds(exams);
  if (ids.length === 0) return null;
  return (
    <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 text-sm text-slate-600">
      <SelectCheckbox
        checked={ids.every((id) => selection.has(id))}
        indeterminate={selection.count > 0}
        label="Chọn tất cả đề có thể xóa trong trang"
        onChange={(checked) => selection.setMany(ids, checked)}
      />
      Chọn tất cả đề chưa xuất bản ({ids.length})
    </div>
  );
}

function ExamTable({
  exams,
  onDelete,
  selection,
}: {
  exams: ExamSummary[];
  onDelete: (exam: ExamSummary) => void;
  selection: Selection;
}) {
  const navigate = useNavigate();
  const ids = deletableIds(exams);
  return (
    <div className="relative hidden overflow-x-auto md:block">
      <table className="w-full min-w-200 text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-semibold tracking-wider whitespace-nowrap text-subtle uppercase">
            <th scope="col" className="w-10 py-1.5 pl-3">
              <SelectCheckbox
                checked={ids.length > 0 && ids.every((id) => selection.has(id))}
                indeterminate={selection.count > 0}
                disabled={ids.length === 0}
                disabledReason="Mọi đề trong trang đang xuất bản"
                label="Chọn tất cả đề có thể xóa trong trang"
                onChange={(checked) => selection.setMany(ids, checked)}
              />
            </th>
            <th scope="col" className="py-3 pr-4 pl-2">
              Tên đề
            </th>
            <th scope="col" className="px-4 py-3">
              Loại đề
            </th>
            <th scope="col" className="px-4 py-3">
              Cấu trúc
            </th>
            <th scope="col" className="px-4 py-3">
              Thời gian
            </th>
            <th scope="col" className="px-4 py-3">
              Trạng thái
            </th>
            <th scope="col" className="px-4 py-3">
              Cập nhật
            </th>
            <th scope="col" className="w-14 py-3 pr-5 pl-2">
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {exams.map((exam) => (
            <tr
              key={exam.id}
              onClick={() => void navigate(examPath(exam.id))}
              className={cn(
                'cursor-pointer align-middle transition-colors hover:bg-slate-50',
                selection.has(exam.id) && 'bg-accent/60 hover:bg-accent',
              )}
            >
              <td className="py-2.5 pl-3">
                <SelectCheckbox
                  checked={selection.has(exam.id)}
                  disabled={exam.status === 'PUBLISHED'}
                  disabledReason={PUBLISHED_REASON}
                  label={`Chọn đề ${exam.title}`}
                  onChange={() => selection.toggle(exam.id)}
                />
              </td>
              <td className="max-w-sm py-4 pr-4 pl-2">
                <Link
                  to={examPath(exam.id)}
                  onClick={(event) => event.stopPropagation()}
                  className="line-clamp-1 font-semibold text-foreground outline-none hover:text-brand focus-visible:underline"
                >
                  {exam.title}
                </Link>
                {exam.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-subtle">{exam.description}</p>
                )}
              </td>
              <td className="px-4 py-4">
                <ExamTypePill scale={exam.scoringScale} />
              </td>
              <td className="px-4 py-4">
                <Structure exam={exam} />
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                {exam.durationMinutes} phút
              </td>
              <td className="px-4 py-4">
                <ExamStatusPill status={exam.status} />
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-slate-600 tabular-nums">
                {formatDate(exam.updatedAt)}
              </td>
              <td
                className="py-3 pr-5 pl-2 text-right"
                onClick={(event) => event.stopPropagation()}
              >
                <RowMenu exam={exam} onDelete={() => onDelete(exam)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExamCard({
  exam,
  onDelete,
  selection,
}: {
  exam: ExamSummary;
  onDelete: () => void;
  selection: Selection;
}) {
  return (
    <li className={cn('flex gap-2 py-4 pr-5 pl-3', selection.has(exam.id) && 'bg-accent/60')}>
      <SelectCheckbox
        checked={selection.has(exam.id)}
        disabled={exam.status === 'PUBLISHED'}
        disabledReason={PUBLISHED_REASON}
        label={`Chọn đề ${exam.title}`}
        onChange={() => selection.toggle(exam.id)}
      />
      <div className="min-w-0 flex-1">
        <Link to={examPath(exam.id)} className="line-clamp-2 font-semibold text-foreground">
          {exam.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ExamTypePill scale={exam.scoringScale} />
          <ExamStatusPill status={exam.status} />
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 text-xs text-subtle">
          <Structure exam={exam} />
          <span>
            {exam.durationMinutes} phút · {formatDate(exam.updatedAt)}
          </span>
        </div>
      </div>
      <RowMenu exam={exam} onDelete={onDelete} />
    </li>
  );
}

const menuItem =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-disabled:cursor-not-allowed data-disabled:opacity-50';

function RowMenu({ exam, onDelete }: { exam: ExamSummary; onDelete: () => void }) {
  const navigate = useNavigate();
  const published = exam.status === 'PUBLISHED';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Thao tác với ${exam.title}`}
        className="h-fit rounded-lg p-2 text-subtle transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/30 data-[state=open]:bg-accent"
      >
        <MoreVertical className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 w-52 rounded-xl border border-border bg-white p-1.5 shadow-xl shadow-slate-900/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item onSelect={() => void navigate(examPath(exam.id))} className={menuItem}>
            <PencilRuler className="size-4 text-subtle" />
            {published ? 'Mở đề' : 'Soạn đề'}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => void navigate(examPreviewPath(exam.id))}
            className={menuItem}
          >
            <Eye className="size-4 text-subtle" />
            Xem trước
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            disabled={published}
            onSelect={onDelete}
            className={cn(menuItem, 'text-destructive data-highlighted:bg-danger-soft')}
          >
            <Trash2 className="size-4" />
            <span className="min-w-0">
              Xóa đề
              {published && (
                <span className="block text-[11px] font-normal text-subtle">
                  Gỡ xuất bản trước khi xóa
                </span>
              )}
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
