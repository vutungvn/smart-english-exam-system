import { Bell, Menu, Search } from 'lucide-react';
import type { RoleCode } from '@/api/generated';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useAppSelector } from '@/hooks/hooks';
import { selectCurrentUser } from '@/store/slice/auth-slice';

const ROLE_LABELS: Record<RoleCode, string> = {
  STUDENT: 'Học viên',
  TEACHER: 'Giáo viên',
  ADMIN: 'Quản trị viên',
};

// Chữ cái đầu của 2 từ cuối trong họ tên: "Nguyễn Minh Anh" → "MA"
function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function StudentTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const user = useAppSelector(selectCurrentUser);
  const fullName = user?.fullName ?? 'Học viên';

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-border bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Mở menu"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-700 hover:bg-accent hover:text-brand lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Màn < sm ẩn ô tìm kiếm, hiện icon logo để người dùng biết đang ở đâu */}
      <div className="sm:hidden">
        <BrandLogo to="/app" compact />
      </div>

      {/* TẠM: chưa có chức năng tìm kiếm, làm cùng danh sách khóa học/đề thi */}
      <label className="relative hidden max-w-md flex-1 sm:block">
        <span className="sr-only">Tìm khóa học, đề thi</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          placeholder="Tìm khóa học, đề thi..."
          className="h-10 w-full rounded-xl border border-border bg-background pr-4 pl-10 text-sm outline-none placeholder:text-subtle focus-visible:border-primary focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-primary/20"
        />
      </label>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {/* TẠM: chấm đỏ là dữ liệu mẫu, nối API thông báo sau */}
        <button
          type="button"
          aria-label="Thông báo (có thông báo mới)"
          className="relative flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-accent hover:text-brand"
        >
          <Bell className="size-5" />
          <span className="absolute top-2 right-2.5 size-2 rounded-full bg-destructive ring-2 ring-white" />
        </button>

        <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />

        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-accent text-sm font-bold text-brand">
            {getInitials(fullName)}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-semibold text-foreground">{fullName}</span>
            {user && <span className="block text-xs text-subtle">{ROLE_LABELS[user.role]}</span>}
          </span>
        </div>
      </div>
    </header>
  );
}
