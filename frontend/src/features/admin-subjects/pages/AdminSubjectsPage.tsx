import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { BookOpen, Eye, EyeOff, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useListAdminSubjectsQuery, type AdminSubjectItem } from '@/api/generated';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  SuccessBanner,
} from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import { ActiveBadge, CategoryBadge, ProtectedBadge } from '../components/SubjectBadges';
import {
  DeleteSubjectDialog,
  SubjectFormDialog,
  ToggleSubjectDialog,
} from '../components/SubjectDialogs';
import { formatCount, subjectPath, type FlashState } from '../labels';

type Action = { kind: 'toggle' | 'delete'; subject: AdminSubjectItem };

const menuItem =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-disabled:cursor-not-allowed data-disabled:opacity-40';

/** Trang Chương trình thi & chủ đề `/admin/subjects` (SPRINT-69): danh sách chương trình thi */
export function AdminSubjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, error, isLoading, isFetching, refetch } = useListAdminSubjectsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const subjects = data?.data ?? [];
  // null: thêm mới; có giá trị: sửa; undefined: đóng
  const [editing, setEditing] = useState<AdminSubjectItem | null | undefined>(undefined);
  const [action, setAction] = useState<Action | null>(null);
  const [flash, setFlash] = useState((location.state as FlashState | null)?.flash);

  const done = (message: string) => {
    setEditing(undefined);
    setAction(null);
    setFlash(message);
  };
  const target = (kind: Action['kind']) => (action?.kind === kind ? action.subject : null);

  return (
    <div className="space-y-6">
      <title>Chương trình thi & chủ đề – Smart English Exam</title>
      <PageHeader
        title="Chương trình thi & chủ đề"
        description="Chương trình thi (TOEIC, IELTS…) và chủ đề dùng để phân loại câu hỏi, thống kê điểm yếu."
        actions={
          <Button
            className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-4 font-semibold shadow-md shadow-primary/30"
            onClick={() => setEditing(null)}
          >
            <Plus />
            Thêm chương trình
          </Button>
        }
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}

      <section className="rounded-3xl border border-border bg-white shadow-2xs">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <BookOpen className="size-5 text-primary" />
            Chương trình thi
          </h2>
          {data && (
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{subjects.length}</span> chương trình
            </span>
          )}
        </div>

        {isLoading ? (
          <div aria-hidden className="divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-5">
                <div className="h-5 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="ml-auto h-5 w-40 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error && !data ? (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Chưa có chương trình thi"
            description="Thêm chương trình đầu tiên để giáo viên soạn câu hỏi, đề thi."
          />
        ) : (
          <ul
            aria-busy={isFetching}
            className={cn('divide-y divide-border transition-opacity', isFetching && 'opacity-60')}
          >
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className="relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* after:absolute: cả dòng bấm được, menu ⋯ nằm trên lớp này */}
                    <Link
                      to={subjectPath(subject.id)}
                      className="font-bold text-foreground outline-none after:absolute after:inset-0 hover:text-brand focus-visible:underline"
                    >
                      {subject.code}
                    </Link>
                    <CategoryBadge category={subject.category} />
                    <ActiveBadge active={subject.isActive} />
                    {subject.isProtected && <ProtectedBadge />}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{subject.name}</p>
                </div>
                <dl className="grid grid-cols-3 gap-4 text-sm sm:w-80">
                  {(
                    [
                      ['Chủ đề', subject.topicCount],
                      ['Đề thi', subject.examCount],
                      ['Câu hỏi', subject.questionCount],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-subtle">{label}</dt>
                      <dd className="font-semibold text-foreground tabular-nums">
                        {formatCount(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="absolute top-3 right-3 z-10 sm:static">
                  <SubjectMenu
                    subject={subject}
                    onView={() => void navigate(subjectPath(subject.id))}
                    onEdit={() => setEditing(subject)}
                    onToggle={() => setAction({ kind: 'toggle', subject })}
                    onDelete={() => setAction({ kind: 'delete', subject })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SubjectFormDialog
        subject={editing}
        onClose={() => setEditing(undefined)}
        onDone={(message, created) =>
          created
            ? void navigate(subjectPath(created.id), { state: { flash: message } })
            : done(message)
        }
      />
      <ToggleSubjectDialog
        subject={target('toggle')}
        onClose={() => setAction(null)}
        onDone={done}
      />
      <DeleteSubjectDialog
        subject={target('delete')}
        onClose={() => setAction(null)}
        onDone={done}
      />
    </div>
  );
}

export function SubjectMenu({
  subject,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: {
  subject: AdminSubjectItem;
  onView?: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Thao tác với ${subject.code}`}
        className="rounded-lg p-2 text-subtle transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/30 data-[state=open]:bg-accent"
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
          {onView && (
            <DropdownMenu.Item onSelect={onView} className={cn(menuItem, 'text-foreground')}>
              <Eye className="size-4 text-subtle" />
              Xem chủ đề
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item onSelect={onEdit} className={cn(menuItem, 'text-foreground')}>
            <Pencil className="size-4 text-subtle" />
            Sửa tên
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onToggle}
            disabled={subject.isProtected}
            className={cn(menuItem, 'text-foreground')}
          >
            {subject.isActive ? (
              <EyeOff className="size-4 text-subtle" />
            ) : (
              <Eye className="size-4 text-subtle" />
            )}
            {subject.isActive ? 'Ẩn chương trình' : 'Dùng lại'}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={onDelete}
            disabled={subject.isProtected}
            className={cn(menuItem, 'text-destructive data-highlighted:bg-danger-soft')}
          >
            <Trash2 className="size-4" />
            Xóa chương trình
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
