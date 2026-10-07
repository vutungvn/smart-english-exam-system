import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, LogOut, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/user-display';
import { useLandingSession } from '../use-landing-session';
import { EnterAppLink } from './EnterAppLink';

// Neo tới các section trên cùng trang (id đặt ở từng section)
const NAV_ITEMS = [
  { href: '#tinh-nang', label: 'Tính năng' },
  { href: '#ky-nang', label: '4 kỹ năng' },
  { href: '#lo-trinh', label: 'Lộ trình' },
  { href: '#khoa-hoc', label: 'Khóa học' },
  { href: '#giao-vien', label: 'Giáo viên' },
  { href: '#hoi-dap', label: 'Hỏi đáp' },
];

const primaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-primary to-brand font-semibold whitespace-nowrap text-white shadow-md shadow-primary/30 transition hover:brightness-95';

// Từ xl (≥ 1280px) menu nằm giữa header; nhỏ hơn thì gom vào nút ☰ mở bảng menu bên dưới header.
// Khu vực bên phải đổi theo phiên: khách thấy Đăng nhập/Đăng ký, đã đăng nhập thấy avatar + nút vào học
export function LandingHeader() {
  const session = useLandingSession();
  const { logout, isLoggingOut } = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Esc đóng bảng menu
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-300 items-center justify-between gap-4 px-4 sm:px-6 xl:h-18">
        <BrandLogo compact />

        <nav aria-label="Điều hướng trang chủ" className="hidden xl:block">
          <ul className="flex items-center gap-1 rounded-full border border-border/80 bg-white/70 p-1 shadow-2xs">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-slate-600 transition-colors hover:bg-accent hover:text-brand"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Đang khôi phục phiên: giữ chỗ để nút không chớp từ "Đăng nhập" sang "Vào học" */}
          {session.state === 'loading' && (
            <span
              aria-hidden
              className="h-10 w-24 animate-pulse rounded-xl bg-slate-200/70 sm:w-52"
            />
          )}

          {session.state === 'guest' && (
            <>
              <Link
                to="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap text-slate-700 transition-colors hover:text-brand min-[400px]:block"
              >
                Đăng nhập
              </Link>
              <Link to="/register" className={cn(primaryButton, 'h-10 px-4 text-sm')}>
                <span className="sm:hidden">Đăng ký</span>
                <span className="hidden sm:inline">Đăng ký </span>
                <ArrowRight className="hidden size-4 sm:block" />
              </Link>
            </>
          )}

          {session.state === 'signed-in' && (
            <>
              <span className="hidden items-center gap-2.5 md:flex" title={session.user.fullName}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-accent text-xs font-bold text-brand">
                  {getInitials(session.user.fullName)}
                </span>
                <span className="max-w-40 truncate text-sm font-semibold text-foreground">
                  {session.user.fullName}
                </span>
              </span>
              <EnterAppLink
                to={session.homePath}
                label={session.enterLabel}
                className="h-10 px-4 text-sm"
              />
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-white text-slate-700 transition-colors hover:bg-accent hover:text-brand xl:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Bảng menu cho màn < xl: đè lên nội dung, đóng khi chọn mục hoặc bấm Esc */}
      <nav
        id="landing-mobile-menu"
        aria-label="Điều hướng trang chủ"
        className={cn(
          'absolute inset-x-0 top-full border-b border-border bg-white shadow-xl shadow-slate-900/5 xl:hidden',
          !menuOpen && 'hidden',
        )}
      >
        <ul className="mx-auto grid w-full max-w-300 gap-1 px-4 py-4 sm:grid-cols-2 sm:px-6 md:grid-cols-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={closeMenu}
                className="block rounded-xl px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-accent hover:text-brand"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {session.state === 'guest' && (
          <div className="mx-auto flex w-full max-w-300 gap-3 border-t border-border px-4 py-4 sm:px-6">
            <Link
              to="/login"
              onClick={closeMenu}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border font-semibold text-slate-700 transition-colors hover:bg-accent"
            >
              Đăng nhập
            </Link>
            <Link to="/register" onClick={closeMenu} className={cn(primaryButton, 'h-11 flex-1')}>
              Đăng ký
            </Link>
          </div>
        )}

        {session.state === 'signed-in' && (
          <div className="mx-auto w-full max-w-300 border-t border-border px-4 py-4 sm:px-6">
            <p className="flex items-center gap-3 px-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-accent text-sm font-bold text-brand">
                {getInitials(session.user.fullName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-foreground">
                  {session.user.fullName}
                </span>
                <span className="block truncate text-sm text-subtle">{session.user.email}</span>
              </span>
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void logout()}
                disabled={isLoggingOut}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border font-semibold text-slate-700 transition-colors hover:bg-danger-soft hover:text-destructive disabled:opacity-60"
              >
                <LogOut className="size-4" />
                Đăng xuất
              </button>
              {/* Chuyển trang sang /app nên bảng menu tự đóng, không cần closeMenu */}
              <EnterAppLink
                to={session.homePath}
                label={session.enterLabel}
                className="h-11 flex-1"
              />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
