import { ADMIN_HOME, ADMIN_NAV, adminPath } from '@/features/admin/admin-nav';
import { AppShell, type SidebarSlotProps } from '../shared/AppShell';
import { AppSidebar, type SidebarSection } from '../shared/AppSidebar';
import { AppTopbar } from '../shared/AppTopbar';

const SECTIONS: SidebarSection[] = ADMIN_NAV.map((section) =>
  section.items.map(({ path, label, icon, comingSoon }) => ({
    to: adminPath(path),
    label,
    icon,
    comingSoon,
    end: path === '', // Tổng quan chỉ sáng ở đúng /admin
  })),
);
const SECTION_TITLES = ADMIN_NAV.map((section) => section.title);

// Khung khu vực quản trị `/admin/*`
export function AdminLayout() {
  return (
    <AppShell
      ariaLabel="Menu quản trị"
      renderSidebar={(props) => <AdminSidebar {...props} />}
      renderTopbar={(onOpenSidebar) => (
        <AppTopbar
          homePath={ADMIN_HOME}
          searchPlaceholder="Tìm người dùng, nhật ký…"
          onOpenSidebar={onOpenSidebar}
        />
      )}
    />
  );
}

function AdminSidebar(props: SidebarSlotProps) {
  return (
    <AppSidebar
      {...props}
      homePath={ADMIN_HOME}
      subtitle="Khu vực quản trị"
      ariaLabel="Khu vực quản trị"
      sections={SECTIONS}
      sectionTitles={SECTION_TITLES}
    />
  );
}
