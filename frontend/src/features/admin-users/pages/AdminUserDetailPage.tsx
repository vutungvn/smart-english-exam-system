import { useState } from 'react';
import { useParams } from 'react-router';
import { skipToken } from '@reduxjs/toolkit/query';
import { Lock, LockOpen, Mail, Pencil, ShieldAlert, UserX } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetAdminUserQuery } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { adminPath } from '@/features/admin/admin-nav';
import {
  EmptyState,
  ErrorState,
  SuccessBanner,
} from '@/features/question-bank/components/ListStates';
import { AccountInfoCard, RoleProfileCard } from '../components/DetailCards';
import { LoginHistoryCard } from '../components/LoginHistoryCard';
import { RoleBadge, StatusBadge } from '../components/UserBadges';
import { EditUserDialog, LockUserDialog, UnlockUserDialog } from '../components/UserDialogs';

const LIST_PATH = adminPath('users');
const outlineButton = 'h-10 rounded-xl bg-white px-4 shadow-2xs';

// Trang chi tiết người dùng `/admin/users/:id`: thông tin, hồ sơ theo vai trò, lịch sử đăng nhập
export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refetch } = useGetAdminUserQuery(id ?? skipToken);
  const user = data?.data;
  const [dialog, setDialog] = useState<'edit' | 'lock' | 'unlock' | null>(null);
  const [flash, setFlash] = useState<string>();

  const breadcrumbs = [
    { label: 'Người dùng', to: LIST_PATH },
    { label: user?.fullName ?? 'Chi tiết' },
  ];

  if (isLoading) return <DetailSkeleton />;

  if (!user) {
    const apiError = error ? toApiError(error) : undefined;
    const notFound =
      apiError?.code === 'USER_NOT_FOUND' || apiError?.code === 'ADMIN_ACCOUNT_PROTECTED';
    return (
      <div className="space-y-6">
        <title>Người dùng – Smart English Exam</title>
        <PageHeader
          breadcrumbs={breadcrumbs}
          title="Chi tiết người dùng"
          description="Thông tin tài khoản và lịch sử đăng nhập"
        />
        <section className="rounded-3xl border border-border bg-white shadow-2xs">
          {notFound ? (
            <EmptyState
              icon={apiError.code === 'ADMIN_ACCOUNT_PROTECTED' ? ShieldAlert : UserX}
              title={
                apiError.code === 'ADMIN_ACCOUNT_PROTECTED'
                  ? 'Không xem được tài khoản quản trị'
                  : 'Không tìm thấy người dùng'
              }
              description={
                apiError.code === 'ADMIN_ACCOUNT_PROTECTED'
                  ? 'Trang này chỉ quản lý tài khoản học viên và giáo viên.'
                  : 'Tài khoản không tồn tại hoặc đường dẫn không đúng.'
              }
            >
              <ButtonLink to={LIST_PATH} className="h-10 w-auto px-5">
                Về danh sách người dùng
              </ButtonLink>
            </EmptyState>
          ) : (
            <ErrorState
              message={apiError?.message ?? 'Không tải được dữ liệu'}
              onRetry={() => void refetch()}
            />
          )}
        </section>
      </div>
    );
  }

  const locked = user.status === 'LOCKED';
  const done = (message: string) => {
    setDialog(null);
    setFlash(message);
  };

  return (
    <div className="space-y-6">
      <title>{`${user.fullName} – Người dùng – Smart English Exam`}</title>
      <PageHeader
        breadcrumbs={breadcrumbs}
        backTo={{ label: 'Danh sách người dùng', to: LIST_PATH }}
        title="Chi tiết người dùng"
        description="Thông tin tài khoản, hồ sơ và lịch sử đăng nhập"
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}

      <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar
              fullName={user.fullName}
              avatarUrl={user.avatarUrl}
              className="size-16 text-xl sm:size-20 sm:text-2xl"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-foreground sm:text-2xl">
                {user.fullName}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
            <Button variant="outline" className={outlineButton} onClick={() => setDialog('edit')}>
              <Pencil />
              Sửa thông tin
            </Button>
            {locked ? (
              <Button
                className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-4 shadow-md shadow-primary/30"
                onClick={() => setDialog('unlock')}
              >
                <LockOpen />
                Mở khóa
              </Button>
            ) : (
              <Button
                variant="outline"
                className={`${outlineButton} border-destructive/30 text-destructive hover:bg-danger-soft hover:text-destructive`}
                onClick={() => setDialog('lock')}
              >
                <Lock />
                Khóa tài khoản
              </Button>
            )}
          </div>
        </div>

        {locked && (
          <div
            role="status"
            className="mt-5 flex items-start gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
          >
            <Lock className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">Tài khoản đang bị khóa.</span> Người dùng không đăng
              nhập được cho tới khi được mở khóa. Lý do khóa được ghi trong nhật ký kiểm toán.
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <AccountInfoCard user={user} />
          <RoleProfileCard user={user} />
        </div>
        <div className="lg:col-span-7">
          <LoginHistoryCard userId={user.id} />
        </div>
      </div>

      <EditUserDialog
        user={dialog === 'edit' ? user : null}
        onClose={() => setDialog(null)}
        onDone={done}
      />
      <LockUserDialog
        user={dialog === 'lock' ? user : null}
        onClose={() => setDialog(null)}
        onDone={done}
      />
      <UnlockUserDialog
        user={dialog === 'unlock' ? user : null}
        onClose={() => setDialog(null)}
        onDone={done}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-16 w-1/3 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100 lg:col-span-5" />
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100 lg:col-span-7" />
      </div>
    </div>
  );
}
