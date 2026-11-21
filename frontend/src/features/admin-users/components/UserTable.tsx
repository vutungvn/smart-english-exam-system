import { Link, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { Eye, Lock, LockOpen, MoreVertical, Pencil } from 'lucide-react';
import type { AdminUserListItem } from '@/api/generated';
import { UserAvatar } from '@/components/UserAvatar';
import { formatDate, formatDateTime } from '@/features/profile/format';
import { cn } from '@/lib/utils';
import { RoleBadge, StatusBadge } from './UserBadges';
import { userPath } from '../labels';

export interface UserRowActions {
  onEdit: (user: AdminUserListItem) => void;
  onLock: (user: AdminUserListItem) => void;
  onUnlock: (user: AdminUserListItem) => void;
}

interface UserTableProps extends UserRowActions {
  users: AdminUserListItem[];
  /** Đang tải trang mới: làm mờ danh sách cũ thay vì nháy về khung xương */
  fetching: boolean;
}

const menuItem =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent';

function LastLogin({ value }: { value: string | null }) {
  return value ? (
    <span className="tabular-nums">{formatDateTime(value)}</span>
  ) : (
    <span className="text-subtle italic">Chưa đăng nhập</span>
  );
}

/** Màn từ md: bảng; màn hẹp hơn: danh sách thẻ (bảng 6 cột không đọc được ở 375px) */
export function UserTable({ users, fetching, ...actions }: UserTableProps) {
  const navigate = useNavigate();

  return (
    <div aria-busy={fetching} className={cn('transition-opacity', fetching && 'opacity-60')}>
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-200 text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold tracking-wider whitespace-nowrap text-subtle uppercase">
              <th scope="col" className="py-3 pr-4 pl-5">
                Người dùng
              </th>
              <th scope="col" className="px-4 py-3">
                Vai trò
              </th>
              <th scope="col" className="px-4 py-3">
                Trạng thái
              </th>
              <th scope="col" className="px-4 py-3">
                Đăng nhập gần nhất
              </th>
              <th scope="col" className="px-4 py-3">
                Ngày tạo
              </th>
              <th scope="col" className="w-14 py-3 pr-5 pl-2">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => void navigate(userPath(user.id))}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="max-w-xs py-3.5 pr-4 pl-5">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      fullName={user.fullName}
                      avatarUrl={user.avatarUrl}
                      className="size-10 text-sm"
                    />
                    <div className="min-w-0">
                      {/* Link thật cho bàn phím và trình đọc màn hình; cả hàng bấm được cho chuột */}
                      <Link
                        to={userPath(user.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="block truncate font-semibold text-foreground outline-none hover:text-brand focus-visible:underline"
                      >
                        {user.fullName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                  <LastLogin value={user.lastLoginAt} />
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 tabular-nums">
                  {formatDate(user.createdAt)}
                </td>
                <td
                  className="py-3 pr-5 pl-2 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <RowMenu
                    user={user}
                    onView={() => void navigate(userPath(user.id))}
                    {...actions}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {users.map((user) => (
          <li key={user.id} className="relative flex items-start gap-3 px-4 py-4">
            <UserAvatar
              fullName={user.fullName}
              avatarUrl={user.avatarUrl}
              className="size-11 text-sm"
            />
            <div className="min-w-0 flex-1">
              {/* after:absolute: cả thẻ bấm được, nút ⋯ nằm trên lớp này nên vẫn bấm riêng */}
              <Link
                to={userPath(user.id)}
                className="block truncate font-semibold text-foreground outline-none after:absolute after:inset-0 focus-visible:underline"
              >
                {user.fullName}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Đăng nhập: <LastLogin value={user.lastLoginAt} />
              </p>
            </div>
            <div className="relative z-10 -mt-1 -mr-1">
              <RowMenu user={user} onView={() => void navigate(userPath(user.id))} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RowMenu({
  user,
  onView,
  onEdit,
  onLock,
  onUnlock,
}: UserRowActions & { user: AdminUserListItem; onView: () => void }) {
  const locked = user.status === 'LOCKED';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Thao tác với ${user.fullName}`}
        className="rounded-lg p-2 text-subtle transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/30 data-[state=open]:bg-accent"
      >
        <MoreVertical className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 w-48 rounded-xl border border-border bg-white p-1.5 shadow-xl shadow-slate-900/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item onSelect={onView} className={cn(menuItem, 'text-foreground')}>
            <Eye className="size-4 text-subtle" />
            Xem chi tiết
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => onEdit(user)}
            className={cn(menuItem, 'text-foreground')}
          >
            <Pencil className="size-4 text-subtle" />
            Chỉnh sửa
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {locked ? (
            <DropdownMenu.Item
              onSelect={() => onUnlock(user)}
              className={cn(menuItem, 'text-primary')}
            >
              <LockOpen className="size-4" />
              Mở khóa
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              onSelect={() => onLock(user)}
              className={cn(menuItem, 'text-destructive data-highlighted:bg-danger-soft')}
            >
              <Lock className="size-4" />
              Khóa tài khoản
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function UserTableSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100 md:w-1/3" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 md:w-1/4" />
          </div>
          <div className="hidden h-6 w-20 animate-pulse rounded-full bg-slate-100 md:block" />
          <div className="hidden h-6 w-24 animate-pulse rounded-full bg-slate-100 md:block" />
          <div className="hidden h-4 w-28 animate-pulse rounded bg-slate-100 lg:block" />
        </div>
      ))}
    </div>
  );
}
