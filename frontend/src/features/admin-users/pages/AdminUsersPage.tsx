import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useListAdminUsersQuery, type AdminUserListItem } from '@/api/generated';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import {
  EmptyState,
  ErrorState,
  SuccessBanner,
} from '@/features/question-bank/components/ListStates';
import { EditUserDialog, LockUserDialog, UnlockUserDialog } from '../components/UserDialogs';
import { UserFilters } from '../components/UserFilters';
import { UserTable, UserTableSkeleton } from '../components/UserTable';
import { PAGE_SIZES, toListArg, useUserFilters } from '../hooks/use-user-filters';

type Action = { kind: 'edit' | 'lock' | 'unlock'; user: AdminUserListItem };

// Trang Quản lý người dùng `/admin/users`: học viên và giáo viên (admin không nằm trong danh sách)
export function AdminUsersPage() {
  const { filters, update, hasFilters, clear } = useUserFilters();
  const { data, error, isLoading, isFetching, refetch } = useListAdminUsersQuery(
    toListArg(filters),
  );
  const [action, setAction] = useState<Action | null>(null);
  const [flash, setFlash] = useState<string>();

  const meta = data?.meta;
  // Đang ở trang cuối mà số người giảm (lọc theo trạng thái rồi khóa/mở): lùi về trang có dữ liệu
  useEffect(() => {
    if (meta && meta.totalPages > 0 && filters.page > meta.totalPages) {
      update({ page: meta.totalPages });
    }
  }, [meta, filters.page, update]);

  const users = data?.data ?? [];
  const closeAction = () => setAction(null);
  const done = (message: string) => {
    setAction(null);
    setFlash(message);
  };
  const target = (kind: Action['kind']) => (action?.kind === kind ? action.user : null);

  return (
    <div className="space-y-6">
      <title>Người dùng – Smart English Exam</title>
      <PageHeader
        title="Người dùng"
        description="Quản lý tài khoản học viên và giáo viên: tìm kiếm, chỉnh sửa, khóa hoặc mở khóa."
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}

      <UserFilters filters={filters} hasFilters={hasFilters} onChange={update} onClear={clear} />

      <section
        aria-label="Danh sách người dùng"
        className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Users className="size-5 text-primary" />
            Danh sách người dùng
          </h2>
          {meta && (
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{meta.total}</span> người dùng
            </span>
          )}
        </div>

        {isLoading ? (
          <UserTableSkeleton rows={Math.min(filters.limit, 6)} />
        ) : error && !data ? (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        ) : users.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="Không có người dùng phù hợp"
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
              icon={Users}
              title="Chưa có người dùng nào"
              description="Học viên và giáo viên tự đăng ký tài khoản sẽ hiện ở đây."
            />
          )
        ) : (
          <UserTable
            users={users}
            fetching={isFetching}
            onEdit={(user) => setAction({ kind: 'edit', user })}
            onLock={(user) => setAction({ kind: 'lock', user })}
            onUnlock={(user) => setAction({ kind: 'unlock', user })}
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

      <EditUserDialog user={target('edit')} onClose={closeAction} onDone={done} />
      <LockUserDialog user={target('lock')} onClose={closeAction} onDone={done} />
      <UnlockUserDialog user={target('unlock')} onClose={closeAction} onDone={done} />
    </div>
  );
}
