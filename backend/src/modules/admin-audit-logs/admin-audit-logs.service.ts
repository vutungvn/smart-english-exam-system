import { Injectable } from '@nestjs/common';
import type { RoleCode } from '../../common/constants/roles.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditContext } from '../../infra/audit/audit-context.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type {
  AuditLogActor,
  AuditLogDetail,
  AuditLogFilterOptions,
  AuditLogListItem,
} from './admin-audit-logs.types.js';
import { actionLabel, entityLabel } from './audit-labels.js';
import {
  AUDIT_EXPORT_CONTENT_TYPES,
  AUDIT_EXPORT_MAX_ROWS,
  auditExportFileName,
  buildAuditExport,
} from './audit-log-export.js';
import type {
  AuditLogFilterDto,
  AuditLogQueryDto,
  ExportAuditLogsDto,
} from './dto/audit-log-filter.dto.js';

const listSelect = {
  id: true,
  createdAt: true,
  action: true,
  entity: true,
  entityId: true,
  ipAddress: true,
  actor: {
    select: { id: true, fullName: true, email: true, role: { select: { code: true } } },
  },
} satisfies Prisma.AuditLogSelect;

const detailSelect = {
  ...listSelect,
  before: true,
  after: true,
  meta: true,
  userAgent: true,
} satisfies Prisma.AuditLogSelect;

type ListRow = Prisma.AuditLogGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.AuditLogGetPayload<{ select: typeof detailSelect }>;

export interface AuditExportFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

/**
 * Tra cứu nhật ký kiểm toán: chỉ đọc. Không có hàm sửa/xóa, DB còn chặn bằng trigger
 * (migration audit_logs_read_only).
 */
@Injectable()
export class AdminAuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditContext,
  ) {}

  async findAll(query: AuditLogQueryDto): Promise<WithMeta<AuditLogListItem[]>> {
    const where = buildWhere(query);
    const direction = query.sort === 'createdAt:asc' ? 'asc' : 'desc';

    // Đếm và lấy trang trong cùng transaction để total khớp với dữ liệu trả về
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: listSelect,
        // Thêm id để thứ tự ổn định khi nhiều bản ghi cùng thời điểm
        orderBy: [{ createdAt: direction }, { id: direction }],
        ...toPrismaPage(query),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(rows.map(toListItem), total, query);
  }

  async findOne(id: string): Promise<AuditLogDetail> {
    const row = await this.prisma.auditLog.findUnique({ where: { id }, select: detailSelect });
    if (!row) throw new AppException(ErrorCode.AUDIT_LOG_NOT_FOUND);
    return toDetail(row);
  }

  /** Hành động, loại đối tượng đã có trong nhật ký, kèm nhãn tiếng Việt cho dropdown lọc */
  async filterOptions(): Promise<AuditLogFilterOptions> {
    const [actions, entities] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        distinct: ['entity'],
        select: { entity: true },
        orderBy: { entity: 'asc' },
      }),
    ]);
    return {
      actions: actions.map(({ action }) => ({ value: action, label: actionLabel(action) })),
      entities: entities.map(({ entity }) => ({ value: entity, label: entityLabel(entity) })),
    };
  }

  async export(dto: ExportAuditLogsDto): Promise<AuditExportFile> {
    const where = buildWhere(dto);
    const total = await this.prisma.auditLog.count({ where });
    if (total > AUDIT_EXPORT_MAX_ROWS) {
      throw new AppException(
        ErrorCode.AUDIT_EXPORT_TOO_LARGE,
        `Có ${total} bản ghi, mỗi lần xuất tối đa ${AUDIT_EXPORT_MAX_ROWS}. ` +
          'Hãy thu hẹp khoảng thời gian hoặc thêm điều kiện lọc',
        { total, max: AUDIT_EXPORT_MAX_ROWS },
      );
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      select: listSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: AUDIT_EXPORT_MAX_ROWS,
    });
    const buffer = await buildAuditExport(dto.format, rows.map(toListItem));

    // Xuất dữ liệu cá nhân cũng để lại dấu vết: ai xuất, điều kiện gì, bao nhiêu dòng
    const { format, ...filters } = dto;
    this.audit.setMeta({ format, rows: rows.length, filters: { ...filters } });

    return {
      buffer,
      contentType: AUDIT_EXPORT_CONTENT_TYPES[format],
      fileName: auditExportFileName(format),
    };
  }
}

function buildWhere(filter: AuditLogFilterDto): Prisma.AuditLogWhereInput {
  const from = filter.from ? new Date(filter.from) : undefined;
  const to = filter.to ? new Date(filter.to) : undefined;
  if (from && to && from > to) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Thời điểm bắt đầu phải trước thời điểm kết thúc',
    );
  }

  const q = filter.q || undefined;
  return {
    actorId: filter.actorId,
    action: filter.action || undefined,
    entity: filter.entity || undefined,
    entityId: filter.entityId,
    createdAt: from || to ? { gte: from, lte: to } : undefined,
    actor: q
      ? {
          is: {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        }
      : undefined,
  };
}

function toActor(actor: ListRow['actor']): AuditLogActor | null {
  if (!actor) return null;
  return {
    id: actor.id,
    fullName: actor.fullName,
    email: actor.email,
    role: actor.role.code as RoleCode,
  };
}

function toListItem(row: ListRow): AuditLogListItem {
  return {
    id: row.id,
    createdAt: row.createdAt,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    ipAddress: row.ipAddress,
    actor: toActor(row.actor),
  };
}

function toDetail(row: DetailRow): AuditLogDetail {
  return {
    ...toListItem(row),
    before: row.before,
    after: row.after,
    meta: row.meta,
    userAgent: row.userAgent,
  };
}
