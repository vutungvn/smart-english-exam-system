import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { X, type LucideIcon } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';
import type { SidebarSlotProps } from './AppShell';

export interface SidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean; // chỉ sáng khi đúng đường dẫn (mục trang chủ)
  badge?: string;
  badgeTone?: 'brand' | 'ai' | 'muted';
  /** Chưa làm: hiện mờ kèm nhãn "Sắp có", không bấm được */
  comingSoon?: boolean;
}

/** Nhóm mục; nhóm sau có đường kẻ ngăn cách */
export type SidebarSection = SidebarItem[];

interface AppSidebarProps extends SidebarSlotProps {
  homePath: string;
  subtitle?: string;
  ariaLabel: string;
  sections: SidebarSection[];
  footer?: ReactNode;
}

const BADGE_TONES = {
  brand: 'bg-accent text-brand',
  ai: 'bg-skill-listening/12 text-emerald-700',
  muted: 'bg-slate-100 text-subtle',
} as const;

const itemClass = 'relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium';

// Sidebar dùng chung: học viên, giáo viên (sau này admin) chỉ khác danh sách mục và phần chân
export function AppSidebar({
  homePath,
  subtitle,
  ariaLabel,
  sections,
  footer,
  onNavigate,
  onClose,
}: AppSidebarProps) {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-white">
      <div className="flex h-18 shrink-0 items-center justify-between gap-2 border-b border-border px-5">
        <BrandLogo to={homePath} subtitle={subtitle} />
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

      <nav aria-label={ariaLabel} className="flex-1 overflow-y-auto px-4 py-6">
        {sections.map((items, index) => (
          <ul
            key={index}
            className={cn('space-y-1', index > 0 && 'mt-4 border-t border-border pt-4')}
          >
            {items.map((item) => (
              <li key={item.to}>
                <SidebarLink item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        ))}
      </nav>

      {footer && <div className="shrink-0 border-t border-border p-4">{footer}</div>}
    </aside>
  );
}

function SidebarLink({ item, onNavigate }: { item: SidebarItem; onNavigate?: () => void }) {
  const Icon = item.icon;

  if (item.comingSoon) {
    return (
      <span aria-disabled className={cn(itemClass, 'cursor-not-allowed text-slate-400')}>
        <Icon className="size-5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        <span
          className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', BADGE_TONES.muted)}
        >
          Sắp có
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          itemClass,
          'transition-colors',
          isActive
            ? 'bg-accent font-semibold text-brand before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary'
            : 'text-slate-600 hover:bg-slate-50 hover:text-foreground',
        )
      }
    >
      <Icon className="size-5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-bold',
            BADGE_TONES[item.badgeTone ?? 'brand'],
          )}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}
