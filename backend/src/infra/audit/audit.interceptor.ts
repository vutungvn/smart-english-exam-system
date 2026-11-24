import { Injectable, Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { mergeMap, type Observable } from 'rxjs';
import { AUDIT_ACTION_KEY, type AuditAction } from '../../common/decorators/audit.decorator.js';
import type { AuthenticatedRequest } from '../../common/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditContext, type AuditRecord } from './audit-context.js';

// Cột audit_logs.user_agent là VARCHAR(500)
const USER_AGENT_MAX_LENGTH = 500;

/**
 * Ghi audit_logs cho route gắn @Audit, sau khi handler chạy thành công (lỗi thì không ghi).
 * Ghi xong mới trả response để dữ liệu nhất quán; ghi nhật ký lỗi chỉ log, không làm hỏng response.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly context: AuditContext,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const action = this.reflector.get<AuditAction | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const record: AuditRecord = {};

    // Nest bọc handler bằng AsyncResource.bind lúc gọi next.handle(), nên handler chạy trong
    // AsyncLocalStorage mở ở đây và Service đọc được record qua AuditContext
    return this.context
      .run(record, () => next.handle())
      .pipe(
        mergeMap(async (body: unknown) => {
          await this.write(action, record, request);
          return body;
        }),
      );
  }

  private async write(
    action: AuditAction,
    record: AuditRecord,
    request: AuthenticatedRequest,
  ): Promise<void> {
    const paramId: unknown = request.params?.id;
    const entityId =
      record.entityId ?? (typeof paramId === 'string' && isUUID(paramId) ? paramId : undefined);

    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: request.user?.id,
          action,
          entity: action.split('.')[0],
          entityId,
          before: record.before,
          after: record.after,
          meta: record.meta,
          ipAddress: request.ip,
          userAgent: request.get('user-agent')?.slice(0, USER_AGENT_MAX_LENGTH),
        },
      });
    } catch (error) {
      this.logger.error(
        `Không ghi được nhật ký ${action}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
