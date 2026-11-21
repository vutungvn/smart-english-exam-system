import { Link } from 'react-router';
import { ChartLine, ChevronRight } from 'lucide-react';
import { useAppSelector } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { adminNavItem, adminPath } from '../admin-nav';

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
 * Trang chủ quản trị `/admin`. TẠM: chưa có API thống kê (SPRINT-68) nên khối số liệu, biểu đồ xu
 * hướng, việc cần xử lý chỉ là khung giữ chỗ; truy cập nhanh đã dùng được
 */
export function AdminOverviewPage() {
  const user = useAppSelector(selectCurrentUser);

  return (
    <div className="space-y-6">
      <title>Tổng quan hệ thống – Smart English Exam</title>
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Tổng quan hệ thống</h1>
        <p className="mt-1.5 text-muted-foreground">
          Xin chào, {user?.fullName ?? 'Quản trị viên'}. Đây là khu vực quản trị Smart English Exam.
        </p>
      </header>

      <section
        aria-label="Thống kê hệ thống"
        className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-white px-6 py-12 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <ChartLine className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-foreground">Thống kê đang được xây dựng</h2>
        <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
          Số người dùng, đề thi đã xuất bản, lượt làm bài, lượt gọi AI, biểu đồ xu hướng và các việc
          cần xử lý sẽ hiện ở đây.
        </p>
      </section>

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
