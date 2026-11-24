import { RoleCode } from '../../common/constants/roles.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UserStatus } from '../../generated/prisma/enums.js';

/** Vai trò admin quản lý được; hệ thống chỉ có một admin (từ seed), không nằm trong danh sách */
export const MANAGED_ROLES = [RoleCode.STUDENT, RoleCode.TEACHER] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];

export function isManagedRole(role: string): role is ManagedRole {
  return (MANAGED_ROLES as readonly string[]).includes(role);
}

/**
 * Trạng thái sau khi mở khóa: không trả thẳng về ACTIVE, để tài khoản bị khóa lúc còn chờ xác minh
 * email hoặc chờ duyệt không nhờ khóa rồi mở khóa mà bỏ qua được bước đó
 */
export function statusAfterUnlock(user: {
  emailVerifiedAt: Date | null;
  teacher: { isApproved: boolean } | null;
}): UserStatus {
  if (!user.emailVerifiedAt) return UserStatus.PENDING_VERIFICATION;
  if (user.teacher && !user.teacher.isApproved) return UserStatus.PENDING_APPROVAL;
  return UserStatus.ACTIVE;
}

/** Trường hồ sơ riêng chỉ sửa được khi khớp vai trò của tài khoản */
export function assertFieldsMatchRole(
  role: ManagedRole,
  dto: { targetScore?: number; organization?: string; specialization?: string },
): void {
  if (dto.targetScore !== undefined && role !== RoleCode.STUDENT) {
    throw new AppException(ErrorCode.BAD_REQUEST, 'Chỉ học viên mới có điểm mục tiêu');
  }
  if (
    (dto.organization !== undefined || dto.specialization !== undefined) &&
    role !== RoleCode.TEACHER
  ) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Chỉ giáo viên mới có đơn vị công tác và chuyên môn',
    );
  }
}
