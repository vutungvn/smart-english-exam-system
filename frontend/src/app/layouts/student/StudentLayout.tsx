import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router';
import aiAssistantAvatar from '@/assets/chatbot/ai-assistant.webp';
import { StudentSidebar } from './StudentSidebar';
import { StudentTopbar } from './StudentTopbar';

/**
 * Khung khu vực học viên `/app/*`: sidebar cố định từ lg (≥ 1024px), nhỏ hơn thì sidebar
 * thành ngăn kéo mở bằng nút ☰ ở thanh trên.
 * TẠM: chưa có RequireAuth/RequireRole, làm ở phần guard.
 */
export function StudentLayout() {
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
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <StudentSidebar />
      </div>

      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu học viên"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <div aria-hidden className="absolute inset-0 bg-slate-900/40" onClick={closeDrawer} />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            <StudentSidebar onNavigate={closeDrawer} onClose={closeDrawer} />
          </div>
        </div>
      )}

      <StudentTopbar onOpenSidebar={() => setDrawerOpen(true)} />

      {/* pb chừa chỗ cho nút trợ giảng AI nổi ở góc dưới */}
      <main className="mx-auto w-full max-w-350 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8">
        <Outlet />
      </main>

      <Link
        to="/app/assistant"
        aria-label="Hỏi trợ giảng AI"
        title="Hỏi trợ giảng AI"
        className="fixed right-6 bottom-6 z-30 size-16 rounded-full shadow-xl shadow-primary/40 transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        {/* Linh vật trợ giảng AI (ảnh tròn, nền trong suốt) */}
        <img src={aiAssistantAvatar} alt="" className="size-full" />
        {/* Chấm xanh "đang hoạt động": sóng lan ra liên tục, tắt khi người dùng chọn giảm chuyển động */}
        <span className="absolute top-1 right-1 flex size-3.5">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-highlight opacity-75 motion-safe:animate-ping motion-reduce:hidden"
          />
          <span className="relative size-3.5 rounded-full bg-highlight ring-2 ring-white" />
        </span>
      </Link>
    </div>
  );
}
