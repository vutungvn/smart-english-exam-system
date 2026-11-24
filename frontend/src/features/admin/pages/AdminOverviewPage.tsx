import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetOverviewQuery } from '@/api/generated';
import { useAppSelector } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { adminNavItem, adminPath } from '../admin-nav';
import { DashboardStatCards, DashboardStatCardsSkeleton } from '../components/DashboardStatCards';
import { DashboardToolbar } from '../components/DashboardToolbar';
import { PendingApprovalBanner } from '../components/PendingApprovalBanner';
import { RecentAuditCard } from '../components/RecentAuditCard';
import { TrendChartCard } from '../components/TrendChartCard';
import { useDashboardFilters } from '../hooks/use-dashboard-filters';

// Lối tắt tới các mục quản trị hay dùng (theo Stitch, khối "Truy cập nhanh")
const QUICK_LINKS = [
  { path: 'users', hint: 'Tìm kiếm, sửa, khóa tài khoản', tone: 'bg-accent text-primary' },
  { path: 'roles', hint: 'Phân quyền theo vai trò', tone: 'bg-violet-50 text-violet-600' },
  { path: 'settings', hint: 'Bảng quy đổi điểm, hạn mức AI', tone: 'bg-slate-100 text-slate-600' },
  {
    path: 'audit-logs',
    hint: 'Tra cứu thao tác quản trị',
    tone: 'bg-emerald-50 text-emerald-600',
  },
];

/**
 * Trang chủ quản trị `/admin` (theo Stitch, màn "Tổng quan Quản trị viên"): chỉ số theo kỳ,
 * giáo viên chờ duyệt, biểu đồ xu hướng, thao tác gần đây, truy cập nhanh.
 * GET /admin/dashboard/overview, /trends; POST /admin/dashboard/refresh
 */
export function AdminOverviewPage() {
  const user = useAppSelector(selectCurrentUser);
  const { range, by, setRange, setBy, arg } = useDashboardFilters();
  const { data, error, isLoading, isFetching, refetch } = useGetOverviewQuery(arg);
  const overview = data?.data;

  return (
    <div className="space-y-6">
      <title>Tổng quan hệ thống – Smart English Exam</title>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Tổng quan hệ thống</h1>
          <p className="mt-1.5 text-muted-foreground">
            Xin chào, {user?.fullName ?? 'Quản trị viên'}. Đây là tình hình hoạt động của Smart
            English Exam.
          </p>
        </div>
        <DashboardToolbar
          range={range}
          onRangeChange={setRange}
          generatedAt={overview?.generatedAt}
        />
      </header>

      {overview && <PendingApprovalBanner count={overview.users.pendingApproval} />}

      {isLoading ? (
        <DashboardStatCardsSkeleton />
      ) : error && !overview ? (
        <section
          role="alert"
          className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-white px-6 py-12 text-center"
        >
          <p className="font-semibold text-foreground">Không tải được số liệu thống kê</p>
          <p className="text-sm text-muted-foreground">{toApiError(error).message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm font-semibold text-primary hover:text-brand"
          >
            Thử lại
          </button>
        </section>
      ) : (
        overview && (
          // Đổi kỳ, làm mới: giữ số cũ và làm mờ trong lúc tải, không nháy khung chờ
          <div
            aria-busy={isFetching}
            className={cn('transition-opacity', isFetching && 'opacity-60')}
          >
            <DashboardStatCards overview={overview} />
          </div>
        )
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <TrendChartCard arg={arg} by={by} onByChange={setBy} className="xl:col-span-2" />
        <RecentAuditCard />
      </div>

      <section
        aria-labelledby="quick-links"
        className="rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6"
      >
        <h2 id="quick-links" className="text-lg font-bold text-foreground">
          Truy cập nhanh
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Các mục quản trị thường dùng</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_LINKS.map(({ path, hint, tone }) => {
            const item = adminNavItem(path);
            if (!item) return null;
            const Icon = item.icon;
            return (
              <li key={path}>
                <Link
                  to={adminPath(path)}
                  className="group flex h-full items-start gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-xl',
                      tone,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-foreground">{item.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>
                  </span>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
