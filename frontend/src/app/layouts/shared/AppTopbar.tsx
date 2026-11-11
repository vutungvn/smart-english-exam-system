import { Menu, Search } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { LanguageMenu, ThemeMenu } from './TopbarPreferences';
import { UserMenu } from './UserMenu';

interface AppTopbarProps {
  homePath: string; // logo dẫn về trang chủ của khu vực
  searchPlaceholder: string;
  onOpenSidebar: () => void;
}

// Thanh trên dùng chung cho các khu vực sau đăng nhập
export function AppTopbar({ homePath, searchPlaceholder, onOpenSidebar }: AppTopbarProps) {
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
        <BrandLogo to={homePath} compact />
      </div>

      {/* TẠM: chưa có tìm kiếm toàn cục, mỗi trang danh sách có ô tìm kiếm riêng */}
      <label className="relative hidden max-w-md flex-1 sm:block">
        <span className="sr-only">{searchPlaceholder}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-xl border border-border bg-background pr-4 pl-10 text-sm outline-none placeholder:text-subtle focus-visible:border-primary focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-primary/20"
        />
      </label>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <LanguageMenu />
        <ThemeMenu />

        <NotificationBell />

        <span aria-hidden className="mx-2 hidden h-8 w-px bg-border sm:block" />

        <UserMenu />
      </div>
    </header>
  );
}
