import { describe, expect, it } from 'vitest';
import { RoleCode } from '../../common/constants/roles.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UserStatus } from '../../generated/prisma/enums.js';
import { assertFieldsMatchRole, isManagedRole, statusAfterUnlock } from './admin-users.rules.js';

describe('statusAfterUnlock', () => {
  it('chưa xác minh email → PENDING_VERIFICATION', () => {
    expect(statusAfterUnlock({ emailVerifiedAt: null, teacher: null })).toBe(
      UserStatus.PENDING_VERIFICATION,
    );
    // Chưa xác minh email thì xét trước, kể cả giáo viên chưa duyệt
    expect(statusAfterUnlock({ emailVerifiedAt: null, teacher: { isApproved: false } })).toBe(
      UserStatus.PENDING_VERIFICATION,
    );
  });

  it('giáo viên đã xác minh nhưng chưa được duyệt → PENDING_APPROVAL', () => {
    expect(statusAfterUnlock({ emailVerifiedAt: new Date(), teacher: { isApproved: false } })).toBe(
      UserStatus.PENDING_APPROVAL,
    );
  });

  it('học viên đã xác minh, giáo viên đã duyệt → ACTIVE', () => {
    expect(statusAfterUnlock({ emailVerifiedAt: new Date(), teacher: null })).toBe(
      UserStatus.ACTIVE,
    );
    expect(statusAfterUnlock({ emailVerifiedAt: new Date(), teacher: { isApproved: true } })).toBe(
      UserStatus.ACTIVE,
    );
  });
});

describe('isManagedRole', () => {
  it('chỉ học viên và giáo viên, không có admin', () => {
    expect(isManagedRole(RoleCode.STUDENT)).toBe(true);
    expect(isManagedRole(RoleCode.TEACHER)).toBe(true);
    expect(isManagedRole(RoleCode.ADMIN)).toBe(false);
  });
});

describe('assertFieldsMatchRole', () => {
  const badRequest = (fn: () => void): void => {
    expect(fn).toThrow(AppException);
    try {
      fn();
    } catch (error) {
      expect((error as AppException).code).toBe(ErrorCode.BAD_REQUEST);
    }
  };

  it('học viên sửa targetScore được, gửi trường của giáo viên thì 400', () => {
    expect(() => assertFieldsMatchRole(RoleCode.STUDENT, { targetScore: 750 })).not.toThrow();
    badRequest(() => assertFieldsMatchRole(RoleCode.STUDENT, { organization: 'A' }));
    badRequest(() => assertFieldsMatchRole(RoleCode.STUDENT, { specialization: 'B' }));
  });

  it('giáo viên sửa organization, specialization được, gửi targetScore thì 400', () => {
    expect(() =>
      assertFieldsMatchRole(RoleCode.TEACHER, { organization: 'A', specialization: 'B' }),
    ).not.toThrow();
    badRequest(() => assertFieldsMatchRole(RoleCode.TEACHER, { targetScore: 750 }));
  });

  it('không gửi trường hồ sơ riêng thì vai trò nào cũng hợp lệ', () => {
    expect(() => assertFieldsMatchRole(RoleCode.STUDENT, {})).not.toThrow();
    expect(() => assertFieldsMatchRole(RoleCode.TEACHER, {})).not.toThrow();
  });
});
