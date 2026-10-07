import { CircleAlert, RotateCw } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetProfileQuery } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AbilityCard } from './components/AbilityCard';
import { IdentityCard } from './components/IdentityCard';
import { PageHeader } from './components/PageHeader';
import { PersonalInfoCard } from './components/PersonalInfoCard';
import { SecurityCard } from './components/SecurityCard';
import { TargetScoreCard } from './components/TargetScoreCard';

// Trang Hồ sơ cá nhân `/app/profile` (theo Stitch): GET/PATCH /me, GET /me/login-history
export function ProfilePage() {
  const { data, isLoading, error, refetch, isFetching } = useGetProfileQuery();
  const profile = data?.data;

  return (
    <div className="mx-auto max-w-300 space-y-6">
      <title>Hồ sơ cá nhân – Smart English Exam</title>
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/app' }, { label: 'Hồ sơ cá nhân' }]}
        title="Hồ sơ cá nhân"
        description="Quản lý thông tin tài khoản và mục tiêu luyện thi của bạn"
      />

      {isLoading && <ProfileSkeleton />}

      {error && !profile && (
        <div className="flex flex-col items-center rounded-3xl border border-border bg-white px-6 py-14 text-center">
          <CircleAlert className="size-10 text-destructive" />
          <p className="mt-3 font-semibold text-foreground">Không tải được hồ sơ</p>
          <p className="mt-1 text-sm text-muted-foreground">{toApiError(error).message}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-5 rounded-xl"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw className={cn(isFetching && 'animate-spin')} />
            Thử lại
          </Button>
        </div>
      )}

      {profile && (
        <>
          {/* Cột trái 360px từ lg; thẻ Năng lực kéo giãn để 2 cột cao bằng nhau */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <IdentityCard profile={profile} />
              {profile.student && <AbilityCard student={profile.student} />}
            </div>
            <div className="flex flex-col gap-6">
              {/* Mỗi form tự lấy giá trị vừa lưu làm mốc mới (reset), nên lưu thẻ này
                  không làm mất phần đang sửa dở ở thẻ kia */}
              <PersonalInfoCard profile={profile} />
              {profile.student && <TargetScoreCard targetScore={profile.student.targetScore} />}
            </div>
          </div>
          <SecurityCard />
        </>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  const block = 'animate-pulse rounded-3xl border border-border bg-white';
  return (
    <div aria-hidden className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className={cn(block, 'h-80')} />
        <div className={cn(block, 'h-72')} />
      </div>
      <div className="flex flex-col gap-6">
        <div className={cn(block, 'h-96')} />
        <div className={cn(block, 'h-80')} />
      </div>
    </div>
  );
}
