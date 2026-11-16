import { Link, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import {
  CircleAlert,
  Eye,
  Headphones,
  ListChecks,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { QuestionGroupSummary } from '@/api/generated';
import { formatDate } from '@/features/profile/format';
import { SelectCheckbox } from '@/components/bulk/SelectCheckbox';
import { cn } from '@/lib/utils';
import { groupEditPath, groupPath, newQuestionPath } from '../paths';
import { groupText, SKILL_META } from '../toeic';
import { StatusPill } from './Pills';

interface GroupCardProps {
  group: QuestionGroupSummary;
  mine: boolean;
  onDelete: () => void;
  /** Có khi trang đang cho chọn nhiều để xóa */
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}

const menuItem =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-disabled:cursor-not-allowed data-disabled:opacity-50';

// Thẻ nhóm câu: bấm cả thẻ để mở chi tiết; tiêu đề là link thật cho bàn phím
export function GroupCard({ group, mine, onDelete, selected, onSelect }: GroupCardProps) {
  const navigate = useNavigate();
  const meta = SKILL_META[group.skill];
  const Icon = meta.icon;
  const text = groupText(group);
  const empty = group.questionCount === 0;
  const detail = groupPath(group.id);

  return (
    <article
      onClick={() => void navigate(detail)}
      className={cn(
        'group flex cursor-pointer flex-col rounded-3xl border bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2">
        {onSelect && (
          <SelectCheckbox
            className="-ml-2"
            checked={!!selected}
            disabled={!mine}
            disabledReason="Nhóm của giáo viên khác"
            label={`Chọn nhóm ${group.topic.name}`}
            onChange={onSelect}
          />
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
            meta.pill,
          )}
        >
          <Icon className="size-3.5" />
          {meta.label}
        </span>
        <span className="text-sm font-semibold whitespace-nowrap text-slate-600">
          Part {group.part}
        </span>
        <span className="ml-auto">
          <StatusPill status={group.status} />
        </span>
        <div onClick={(event) => event.stopPropagation()}>
          <CardMenu group={group} mine={mine} onDelete={onDelete} />
        </div>
      </div>

      <Link
        to={detail}
        onClick={(event) => event.stopPropagation()}
        className="mt-4 line-clamp-1 font-semibold text-foreground outline-none group-hover:text-brand focus-visible:underline"
      >
        {group.topic.name}
      </Link>
      <p className="mt-0.5 truncate text-xs text-subtle">
        {mine ? (
          <span className="font-semibold text-primary">Bạn</span>
        ) : (
          <span className="text-slate-600">{group.author.fullName}</span>
        )}{' '}
        · Cập nhật {formatDate(group.updatedAt)}
      </p>

      {/* line-clamp ở thẻ trong: đặt chung với padding thì lộ nửa dòng thứ 4 */}
      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
        <p
          className={cn(
            'line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed wrap-break-word',
            text ? 'text-slate-600' : 'text-subtle italic',
          )}
        >
          {text || 'Chưa có nội dung'}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4 text-xs">
        {empty ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">
            <CircleAlert className="size-3.5" />
            Chưa có câu hỏi
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <ListChecks className="size-4 text-subtle" />
            {group.questionCount} câu hỏi
          </span>
        )}
        {group.skill === 'LISTENING' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">
            <Headphones className="size-3.5" />
            {group.audioKey ? 'Có audio' : 'Chưa có audio'}
          </span>
        )}
      </div>
    </article>
  );
}

function CardMenu({ group, mine, onDelete }: GroupCardProps) {
  const navigate = useNavigate();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Thao tác"
        className="-mr-2 rounded-lg p-2 text-subtle transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/30 data-[state=open]:bg-accent"
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
          <DropdownMenu.Item
            onSelect={() => void navigate(groupPath(group.id))}
            className={menuItem}
          >
            <Eye className="size-4 text-subtle" />
            Xem chi tiết
          </DropdownMenu.Item>
          {mine && (
            <>
              <DropdownMenu.Item
                onSelect={() => void navigate(groupEditPath(group.id))}
                className={menuItem}
              >
                <Pencil className="size-4 text-subtle" />
                Sửa nhóm
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() =>
                  void navigate(
                    newQuestionPath({ skill: group.skill, part: group.part, groupId: group.id }),
                  )
                }
                className={menuItem}
              >
                <Plus className="size-4 text-subtle" />
                Thêm câu vào nhóm
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={onDelete}
                className={cn(menuItem, 'text-destructive data-highlighted:bg-danger-soft')}
              >
                <Trash2 className="size-4" />
                <span className="min-w-0">
                  Xóa nhóm
                  {group.questionCount > 0 && (
                    <span className="block text-[11px] font-normal text-subtle">
                      Kèm {group.questionCount} câu trong nhóm
                    </span>
                  )}
                </span>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function GroupGridSkeleton({ count }: { count: number }) {
  return (
    <div aria-hidden className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-4 rounded-3xl border border-border bg-white p-5">
          <div className="flex justify-between">
            <div className="h-6 w-32 animate-pulse rounded-full bg-slate-100" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-18 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
