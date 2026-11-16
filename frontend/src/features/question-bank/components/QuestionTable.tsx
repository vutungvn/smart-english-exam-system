import { Link, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { Eye, Layers, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { QuestionSummary } from '@/api/generated';
import { SelectCheckbox } from '@/components/bulk/SelectCheckbox';
import type { Selection } from '@/components/bulk/use-selection';
import { formatDate } from '@/features/profile/format';
import { cn } from '@/lib/utils';
import { DifficultyPill, SkillPill, StatusPill } from './Pills';

interface QuestionTableProps {
  questions: QuestionSummary[];
  currentUserId?: string;
  /** Đang tải trang mới: làm mờ bảng cũ thay vì nháy về khung xương */
  fetching: boolean;
  onDelete: (question: QuestionSummary) => void;
  /** Chọn nhiều để xóa; chỉ chọn được câu do mình tạo */
  selection?: Selection;
}

const menuItem =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent';

export function QuestionTable({
  questions,
  currentUserId,
  fetching,
  onDelete,
  selection,
}: QuestionTableProps) {
  const navigate = useNavigate();
  const myIds = questions
    .filter((question) => question.author.id === currentUserId)
    .map((question) => question.id);
  const allSelected = myIds.length > 0 && myIds.every((id) => selection?.has(id));

  return (
    <div
      aria-busy={fetching}
      // relative: phần tử sr-only (absolute) trong bảng không thoát ra ngoài khung cuộn, làm giãn cả trang
      className={cn('relative overflow-x-auto transition-opacity', fetching && 'opacity-60')}
    >
      <table className="w-full min-w-215 text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-semibold tracking-wider whitespace-nowrap text-subtle uppercase">
            {selection && (
              <th scope="col" className="w-10 py-1.5 pl-3">
                <SelectCheckbox
                  checked={allSelected}
                  indeterminate={selection.count > 0}
                  disabled={myIds.length === 0}
                  disabledReason="Trang này không có câu do bạn tạo"
                  label="Chọn tất cả câu của bạn trong trang"
                  onChange={(checked) => selection.setMany(myIds, checked)}
                />
              </th>
            )}
            <th scope="col" className={cn('py-3 pr-4', selection ? 'pl-2' : 'pl-5')}>
              Câu hỏi
            </th>
            <th scope="col" className="px-4 py-3">
              Kỹ năng · Part
            </th>
            <th scope="col" className="px-4 py-3">
              Độ khó
            </th>
            <th scope="col" className="px-4 py-3">
              Trạng thái
            </th>
            <th scope="col" className="px-4 py-3">
              Người tạo
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
          {questions.map((question) => {
            const mine = question.author.id === currentUserId;
            const detailPath = `/teacher/questions/${question.id}`;
            return (
              <tr
                key={question.id}
                onClick={() => void navigate(detailPath)}
                className={cn(
                  'cursor-pointer align-top transition-colors hover:bg-slate-50',
                  selection?.has(question.id) && 'bg-accent/60 hover:bg-accent',
                )}
              >
                {selection && (
                  <td className="py-2.5 pl-3">
                    <SelectCheckbox
                      checked={selection.has(question.id)}
                      disabled={!mine}
                      disabledReason="Câu của giáo viên khác"
                      label={`Chọn câu ${question.code ?? question.content.slice(0, 30)}`}
                      onChange={() => selection.toggle(question.id)}
                    />
                  </td>
                )}
                <td className={cn('max-w-md py-4 pr-4', selection ? 'pl-2' : 'pl-5')}>
                  {/* Link thật cho bàn phím và trình đọc màn hình; cả hàng bấm được cho chuột */}
                  <Link
                    to={detailPath}
                    onClick={(event) => event.stopPropagation()}
                    className="line-clamp-2 font-medium text-foreground outline-none hover:text-brand focus-visible:underline"
                  >
                    {question.content}
                  </Link>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
                    <span>{question.topic.name}</span>
                    {question.groupId && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                        <Layers className="size-3" />
                        Nhóm · câu {question.orderInGroup}
                      </span>
                    )}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <SkillPill skill={question.skill} />
                    <span className="font-medium text-slate-600">Part {question.part}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <DifficultyPill difficulty={question.difficulty} />
                </td>
                <td className="px-4 py-4">
                  <StatusPill status={question.status} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {mine ? (
                    <span className="font-semibold text-primary">Bạn</span>
                  ) : (
                    <span className="text-slate-700">{question.author.fullName}</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-slate-600 tabular-nums">
                  {formatDate(question.updatedAt)}
                </td>
                <td
                  className="py-3 pr-5 pl-2 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <RowMenu
                    mine={mine}
                    onView={() => void navigate(detailPath)}
                    onDelete={() => onDelete(question)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowMenu({
  mine,
  onView,
  onDelete,
}: {
  mine: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Thao tác"
        className="rounded-lg p-2 text-subtle transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/30 data-[state=open]:bg-accent"
      >
        <MoreVertical className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 w-44 rounded-xl border border-border bg-white p-1.5 shadow-xl shadow-slate-900/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Câu của người khác: chỉ xem, quyền sửa/xóa backend cũng chặn */}
          <DropdownMenu.Item onSelect={onView} className={cn(menuItem, 'text-foreground')}>
            {mine ? (
              <Pencil className="size-4 text-subtle" />
            ) : (
              <Eye className="size-4 text-subtle" />
            )}
            {mine ? 'Xem & sửa' : 'Xem chi tiết'}
          </DropdownMenu.Item>
          {mine && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={onDelete}
                className={cn(menuItem, 'text-destructive data-highlighted:bg-danger-soft')}
              >
                <Trash2 className="size-4" />
                Xóa câu hỏi
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function QuestionTableSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-5">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="hidden h-6 w-28 animate-pulse rounded-full bg-slate-100 sm:block" />
          <div className="hidden h-6 w-20 animate-pulse rounded-full bg-slate-100 md:block" />
          <div className="hidden h-6 w-20 animate-pulse rounded-full bg-slate-100 lg:block" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
