import { RoleCode } from '../../common/constants/roles.js';

/**
 * Nhãn tiếng Việt của hành động, đối tượng trong nhật ký. Nguồn chung cho bộ lọc FE
 * (GET /admin/audit-logs/filters) và tệp xuất; thêm @Audit mới thì khai báo nhãn ở đây.
 * Mã chưa có nhãn vẫn hiện bằng chính mã đó.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'user.update': 'Sửa thông tin người dùng',
  'user.lock': 'Khóa tài khoản',
  'user.unlock': 'Mở khóa tài khoản',
  'assessment.override': 'Giáo viên chấm/sửa điểm Speaking, Writing',
  'audit_log.export': 'Xuất nhật ký kiểm toán',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  user: 'Người dùng',
  assessment: 'Bài chấm Speaking, Writing',
  audit_log: 'Nhật ký kiểm toán',
};

export const ROLE_LABELS: Record<RoleCode, string> = {
  [RoleCode.ADMIN]: 'Quản trị viên',
  [RoleCode.TEACHER]: 'Giáo viên',
  [RoleCode.STUDENT]: 'Học viên',
};

export function actionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function entityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity;
}
