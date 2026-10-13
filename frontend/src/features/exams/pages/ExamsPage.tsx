import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { Eye, FilePlus2, MoreVertical, PencilRuler, Plus, Search, Trash2 } from 'lucide-react';
import { AppDialog } from '@/components/AppDialog';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/features/profile/format';
import { FilterSelect, SegmentedControl } from '@/features/question-bank/components/FilterControls';
import { EmptyState, SuccessBanner } from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import { ExamFormDialog } from '../components/ExamFormDialog';
import { ExamStatusPill, ExamTypePill } from '../components/ExamPills';
import { EXAM_STATUS_META, EXAM_STATUSES, EXAM_TYPE_META, SCALES } from '../exam-meta';
import { expectedTotal } from '../mock/check-exam';
import { mockExams, useMockExams } from '../mock/mock-store';
import { examPath, examPreviewPath } from '../paths';
import type { ExamDetail, ExamStatus, ScoringScale } from '../types';

const PAGE_SIZES = [10, 20, 50] as const;

export interface ExamsLocationState {
  flash?: string;
}

// TẠM (lượt 1): dữ liệu lấy từ mock-store; lượt 2 đổi sang useListExamsQuery + bộ lọc trên URL
export function ExamsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const exams = useMockExams();
  const [status, setStatus] = useState<ExamStatus>();
  const [scale, setScale] = useState<ScoringScale>();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(PAGE_SIZES[0]);
  const [creating, setCreating] = useState(0); // đổi key để mở hộp thoại với form mới
  const [pendingDelete, setPendingDelete] = useState<ExamDetail | null>(null);

  const [flash, setFlash] = useState(() => (location.state as ExamsLocationState | null)?.flash);
  useEffect(() => {
    if ((location.state as ExamsLocationState | null)?.flash) {
      void navigate({ search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);

  const keyword = query.trim().toLowerCase();
  const filtered = exams.filter(
    (exam) =>
      (!status || exam.status === status) &&
      (!scale || exam.scoringScale === scale) &&
      (!keyword || exam.title.toLowerCase().includes(keyword)),
  );
  const totalPages = Math.ceil(filtered.length / limit);
  const current = Math.min(page, Math.max(totalPages, 1));
  const rows = filtered.slice((current - 1) * limit, current * limit);
  const hasFilters = Boolean(status || scale || keyword);
  const clear = () => {
    setStatus(undefined);
    setScale(undefined);
    setQuery('');
    setPage(1);
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
            onClick={() => setCreating((n) => n + 1)}
            className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-4 font-semibold shadow-md shadow-primary/30 hover:brightness-95"
          >
            <Plus />
            Tạo đề thi
          </Button>
        }
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}

      <section
        aria-label="Bộ lọc đề thi"
        className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-5 xl:flex-row xl:items-center"
      >
        <SegmentedControl<ExamStatus>
          label="Trạng thái"
          value={status}
          onChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          options={[
            { label: 'Tất cả' },
            ...EXAM_STATUSES.map((item) => ({ value: item, label: EXAM_STATUS_META[item].label })),
          ]}
          className="grid grid-cols-2 sm:flex xl:shrink-0"
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] xl:flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên đề…"
              aria-label="Tìm theo tên đề"
              className="h-10 w-full rounded-xl border border-border bg-slate-50 pr-3 pl-10 text-sm outline-none transition-colors placeholder:text-subtle hover:border-slate-300 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-primary/20"
            />
          </div>
          <div className="[&>div>label]:sr-only">
            <FilterSelect
              label="Loại đề"
              value={scale ?? ''}
              placeholder="Mọi loại đề"
              onChange={(value) => {
                setScale((value || undefined) as ScoringScale | undefined);
                setPage(1);
              }}
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
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> đề
          </span>
        </div>

        {rows.length === 0 ? (
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
              <Button className="h-10 rounded-xl px-5" onClick={() => setCreating((n) => n + 1)}>
                <Plus />
                Tạo đề thi
              </Button>
            </EmptyState>
          )
        ) : (
          <>
            {/* Bảng từ md trở lên; màn hẹp hiện dạng thẻ để không phải cuộn ngang */}
            <ExamTable exams={rows} onDelete={setPendingDelete} />
            <ul className="divide-y divide-border md:hidden">
              {rows.map((exam) => (
                <ExamCard key={exam.id} exam={exam} onDelete={() => setPendingDelete(exam)} />
              ))}
            </ul>
          </>
        )}

        {filtered.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <Pagination
              page={current}
              totalPages={totalPages}
              limit={limit}
              pageSizes={PAGE_SIZES}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>

      {creating > 0 && (
        <ExamFormDialog
          key={creating}
          open
          onOpenChange={(open) => !open && setCreating(0)}
          onSubmit={(values) => {
            const created = mockExams.create(values);
            void navigate(examPath(created.id), {
              state: { flash: 'Đã tạo đề, hãy thêm các Part và câu hỏi' },
            });
          }}
        />
      )}

      <AppDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Xóa đề thi?"
        description="Đề sẽ không còn trong danh sách. Bài làm cũ của học viên (nếu có) vẫn được giữ."
        footer={
          <>
            <Button
              variant="outline"
              className="h-10 rounded-xl px-4"
              onClick={() => setPendingDelete(null)}
            >
              Hủy
            </Button>
            <Button
              className="h-10 rounded-xl bg-destructive px-4 text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) mockExams.remove(pendingDelete.id);
                setPendingDelete(null);
                setFlash('Đã xóa đề thi');
              }}
            >
              <Trash2 />
              Xóa đề
            </Button>
          </>
        }
      >
        <p className="rounded-xl border-l-4 border-destructive/50 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          {pendingDelete?.title}
        </p>
      </AppDialog>
    </div>
  );
}

/** "7 Part · 195/200 câu" kèm thanh tiến độ (đề chuẩn); đề luyện tập chỉ ghi số câu */
function Structure({ exam }: { exam: ExamDetail }) {
  const expected = expectedTotal(exam);
  const done = expected !== null && expected > 0 && exam.questionCount === expected;
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

function ExamTable({
  exams,
  onDelete,
}: {
  exams: ExamDetail[];
  onDelete: (exam: ExamDetail) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="relative hidden overflow-x-auto md:block">
      <table className="w-full min-w-200 text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-semibold tracking-wider whitespace-nowrap text-subtle uppercase">
            <th scope="col" className="py-3 pr-4 pl-5">
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
              className="cursor-pointer align-middle transition-colors hover:bg-slate-50"
            >
              <td className="max-w-sm py-4 pr-4 pl-5">
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

function ExamCard({ exam, onDelete }: { exam: ExamDetail; onDelete: () => void }) {
  return (
    <li className="flex gap-3 px-5 py-4">
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

function RowMenu({ exam, onDelete }: { exam: ExamDetail; onDelete: () => void }) {
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
