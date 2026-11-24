import type {
  AdminUserDetail,
  ListAdminUsersApiArg,
  ManagedRole,
  UserStatus,
} from '@/api/generated';

export type AdminUserSort = NonNullable<ListAdminUsersApiArg['sort']>;

export const MANAGED_ROLES: ManagedRole[] = ['STUDENT', 'TEACHER'];

// Thứ tự hiện trong ô lọc trạng thái
export const USER_STATUSES: UserStatus[] = [
  'ACTIVE',
  'PENDING_VERIFICATION',
  'PENDING_APPROVAL',
  'LOCKED',
];

export const ROLE_META: Record<ManagedRole, { label: string; pill: string }> = {
  STUDENT: { label: 'Học viên', pill: 'bg-accent text-brand' },
  TEACHER: { label: 'Giáo viên', pill: 'bg-violet-50 text-violet-700' },
};

export const STATUS_META: Record<UserStatus, { label: string; pill: string; dot: string }> = {
  ACTIVE: { label: 'Hoạt động', pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PENDING_VERIFICATION: {
    label: 'Chờ xác minh email',
    pill: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt',
    pill: 'bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-500',
  },
  LOCKED: { label: 'Đã khóa', pill: 'bg-danger-soft text-destructive', dot: 'bg-destructive' },
};

export const SORT_OPTIONS: { value: AdminUserSort; label: string }[] = [
  { value: 'createdAt:desc', label: 'Mới tạo nhất' },
  { value: 'createdAt:asc', label: 'Cũ nhất' },
  { value: 'lastLoginAt:desc', label: 'Đăng nhập gần đây' },
  { value: 'fullName:asc', label: 'Tên A → Z' },
];

/**
 * Trạng thái sau khi mở khóa, khớp quy tắc ở backend (admin-users.rules.ts): tài khoản bị khóa lúc
 * còn chờ xác minh email hoặc chờ duyệt thì quay về đúng bước đó, không thành Hoạt động
 */
export function statusAfterUnlock(
  user: Pick<AdminUserDetail, 'emailVerifiedAt' | 'teacher'>,
): UserStatus {
  if (!user.emailVerifiedAt) return 'PENDING_VERIFICATION';
  if (user.teacher && !user.teacher.isApproved) return 'PENDING_APPROVAL';
  return 'ACTIVE';
}

export const userPath = (id: string) => `/admin/users/${id}`;
