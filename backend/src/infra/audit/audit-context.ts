import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '../../generated/prisma/client.js';

/** Ảnh chụp dữ liệu ghi vào audit_logs: chỉ các trường nghiệp vụ, không mật khẩu, không token */
export type AuditSnapshot = Prisma.InputJsonObject;

/** Dữ liệu một lượt ghi nhật ký, Service điền dần trong lúc xử lý request */
export interface AuditRecord {
  entityId?: string;
  before?: AuditSnapshot;
  after?: AuditSnapshot;
  meta?: AuditSnapshot;
}

/**
 * Cho Service gửi before/after tới AuditInterceptor mà không phải nhận request làm tham số.
 * Mỗi request có @Audit chạy trong một AsyncLocalStorage riêng; route không có @Audit thì các
 * lệnh set* không làm gì, nên Service gọi thoải mái kể cả khi được dùng lại ở chỗ khác.
 */
@Injectable()
export class AuditContext {
  private readonly storage = new AsyncLocalStorage<AuditRecord>();

  run<T>(record: AuditRecord, fn: () => T): T {
    return this.storage.run(record, fn);
  }

  setEntityId(entityId: string): void {
    this.update({ entityId });
  }

  setBefore(snapshot: AuditSnapshot): void {
    this.update({ before: snapshot });
  }

  setAfter(snapshot: AuditSnapshot): void {
    this.update({ after: snapshot });
  }

  setMeta(meta: AuditSnapshot): void {
    this.update({ meta });
  }

  private update(patch: AuditRecord): void {
    const record = this.storage.getStore();
    if (record) Object.assign(record, patch);
  }
}
