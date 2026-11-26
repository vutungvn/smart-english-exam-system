import {
  BookOpen,
  ChartNoAxesColumn,
  Database,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  /** Đường dẫn tương đối với /admin; rỗng là trang Tổng quan */
  path: string;
  label: string;
  icon: LucideIcon;
  /** Chưa làm, mục "nên có": sidebar hiện mờ kèm "Sắp có", không có route */
  comingSoon?: boolean;
}

export interface AdminNavSection {
  title?: string;
  items: AdminNavItem[];
}

export const ADMIN_HOME = '/admin';

/** Menu khu vực quản trị (kế hoạch Mục 8.1, Epic SPRINT-16) */
export const ADMIN_NAV: AdminNavSection[] = [
  { items: [{ path: '', label: 'Tổng quan', icon: LayoutDashboard }] },
  {
    title: 'Người dùng',
    items: [
      { path: 'users', label: 'Người dùng', icon: Users },
      { path: 'teacher-applications', label: 'Duyệt giáo viên', icon: UserCheck },
      { path: 'roles', label: 'Vai trò & quyền', icon: Shield },
    ],
  },
  {
    title: 'Nội dung & hệ thống',
    items: [
      { path: 'subjects', label: 'Chương trình thi & chủ đề', icon: BookOpen },
      { path: 'settings', label: 'Cấu hình hệ thống', icon: Settings },
      { path: 'ai-usage', label: 'Thống kê AI', icon: Sparkles },
      { path: 'reports', label: 'Báo cáo', icon: ChartNoAxesColumn, comingSoon: true },
      { path: 'audit-logs', label: 'Nhật ký kiểm toán', icon: ScrollText },
      { path: 'backups', label: 'Sao lưu', icon: Database, comingSoon: true },
    ],
  },
  { items: [{ path: 'profile', label: 'Hồ sơ cá nhân', icon: UserRound }] },
];

export function adminPath(path: string): string {
  return path ? `${ADMIN_HOME}/${path}` : ADMIN_HOME;
}

/**
 * TẠM: mục đã có trong menu nhưng chưa làm trang, hiện "đang phát triển" trong layout.
 * Làm xong trang nào thì xóa path đó khỏi đây và khai báo route thật trong router
 */
export const ADMIN_PLACEHOLDERS: string[] = ['teacher-applications', 'roles', 'ai-usage'];

export function adminNavItem(path: string): AdminNavItem | undefined {
  return ADMIN_NAV.flatMap((section) => section.items).find((item) => item.path === path);
}
