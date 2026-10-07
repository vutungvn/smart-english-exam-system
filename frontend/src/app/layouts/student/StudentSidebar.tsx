import { Link, NavLink } from 'react-router';
import {
  BookOpen,
  Bot,
  BrainCircuit,
  ChartNoAxesColumn,
  ChevronRight,
  CircleCheck,
  FileText,
  House,
  Layers,
  LogOut,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { cn } from '@/lib/utils';

// TẠM: badge "24" và mục tiêu là dữ liệu mẫu, lấy từ API flashcard và hồ sơ khi có
const NAV_ITEMS = [
  { to: '/app', label: 'Trang chủ', icon: House, end: true },
  { to: '/app/courses', label: 'Khóa học của tôi', icon: BookOpen },
  { to: '/app/exams', label: 'Luyện đề thi', icon: FileText },
  { to: '/app/results', label: 'Kết quả & xem lại', icon: CircleCheck },
  { to: '/app/progress', label: 'Tiến độ học tập', icon: ChartNoAxesColumn },
  { to: '/app/ai-analysis', label: 'Phân tích AI', icon: BrainCircuit },
  { to: '/app/assistant', label: 'Trợ giảng AI', icon: Bot, badge: 'AI', badgeTone: 'ai' },
  { to: '/app/flashcards', label: 'Flashcard', icon: Layers, badge: '24' },
] as const;

const TARGET_SCORE = 750;
const TARGET_PROGRESS = 83; // % điểm dự đoán LR so với mục tiêu

interface StudentSidebarProps {
  onNavigate?: () => void; // đóng ngăn kéo trên màn hẹp sau khi chọn mục
  onClose?: () => void; // có thì hiện nút X (ngăn kéo mobile)
}

export function StudentSidebar({ onNavigate, onClose }: StudentSidebarProps) {
  const { logout, isLoggingOut } = useLogout();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-white">
      <div className="flex h-18 shrink-0 items-center justify-between gap-2 border-b border-border px-5">
        <BrandLogo to="/app" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng menu"
            className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-accent hover:text-brand"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav aria-label="Khu vực học viên" className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent font-semibold text-brand before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-foreground',
                    )
                  }
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {'badge' in item && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        'badgeTone' in item
                          ? 'bg-skill-listening/12 text-emerald-700'
                          : 'bg-accent text-brand',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border p-4">
        <div className="rounded-2xl border border-primary/20 bg-accent p-4">
          <div className="flex items-center justify-between gap-2 text-xs font-bold">
            <span className="tracking-wider text-brand uppercase">Mục tiêu của bạn</span>
            <span className="text-sm text-primary">{TARGET_SCORE}+ điểm</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${TARGET_PROGRESS}%` }}
            />
          </div>
          <Link
            to="/app/profile"
            onClick={onNavigate}
            className="mt-3 flex items-center justify-between text-xs font-semibold text-brand hover:underline"
          >
            Chỉnh mục tiêu
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-danger-soft hover:text-destructive disabled:opacity-60"
        >
          <LogOut className="size-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
