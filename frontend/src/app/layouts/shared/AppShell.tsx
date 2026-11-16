import { useEffect, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { NotificationListener } from '@/features/notifications/NotificationListener';

export interface SidebarSlotProps {
  onNavigate?: () => void; // đóng ngăn kéo trên màn hẹp sau khi chọn mục
  onClose?: () => void; // có thì hiện nút X (ngăn kéo mobile)
}

interface AppShellProps {
  ariaLabel: string; // tên ngăn kéo cho trình đọc màn hình, ví dụ "Menu học viên"
  renderSidebar: (props: SidebarSlotProps) => ReactNode;
  renderTopbar: (onOpenSidebar: () => void) => ReactNode;
  children?: ReactNode; // phần nổi (nút trợ giảng AI của học viên)
  mainClassName?: string;
}

/**
 * Khung chung của các khu vực sau đăng nhập: sidebar cố định từ lg (≥ 1024px),
 * nhỏ hơn thì sidebar thành ngăn kéo mở bằng nút ☰ ở thanh trên.
 */
export function AppShell({
  ariaLabel,
  renderSidebar,
  renderTopbar,
  children,
  mainClassName = 'pb-12',
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  // Esc đóng ngăn kéo
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh bg-background lg:pl-72">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{renderSidebar({})}</div>

      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className="fixed inset-0 z-50 lg:hidden"
        >
          <div aria-hidden className="absolute inset-0 bg-slate-900/40" onClick={closeDrawer} />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            {renderSidebar({ onNavigate: closeDrawer, onClose: closeDrawer })}
          </div>
        </div>
      )}

      {renderTopbar(() => setDrawerOpen(true))}

      <main
        className={`mx-auto w-full max-w-350 px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8 ${mainClassName}`}
      >
        <Outlet />
      </main>

      {children}
      {/* Nhận thông báo realtime (chấm xong bài, tự nộp…) khi đang ở các trang sau đăng nhập */}
      <NotificationListener />
    </div>
  );
}
