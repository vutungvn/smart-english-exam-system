import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

/** Dạng <entity>.<action>, ví dụ user.lock; phần trước dấu chấm ghi vào cột entity */
export type AuditAction = `${string}.${string}`;

/**
 * Ghi một dòng audit_logs sau khi route chạy thành công (AuditInterceptor đọc metadata này).
 * entityId mặc định lấy từ :id trên URL; before/after do Service đặt qua AuditContext.
 */
export const Audit = (action: AuditAction): MethodDecorator =>
  SetMetadata(AUDIT_ACTION_KEY, action);
