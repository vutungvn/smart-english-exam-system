import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Trim } from '../../../common/transforms/trim.transform.js';

/** Điều kiện tra cứu dùng chung cho danh sách (query) và xuất tệp (body) */
export class AuditLogFilterDto {
  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Từ thời điểm (ISO 8601, tính cả mốc này)',
    example: '2026-11-01T00:00:00+07:00',
  })
  @IsOptional()
  @IsDateString({}, { message: 'from phải là thời điểm ISO 8601' })
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Đến thời điểm (ISO 8601, tính cả mốc này)',
    example: '2026-11-30T23:59:59+07:00',
  })
  @IsOptional()
  @IsDateString({}, { message: 'to phải là thời điểm ISO 8601' })
  to?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Người thực hiện' })
  @IsOptional()
  @IsUUID('all', { message: 'actorId phải là UUID' })
  actorId?: string;

  @ApiPropertyOptional({ description: 'Tìm người thực hiện theo họ tên hoặc email' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'q phải là chuỗi' })
  @MaxLength(100, { message: 'Từ khóa tối đa 100 ký tự' })
  q?: string;

  @ApiPropertyOptional({ description: 'Hành động, ví dụ user.lock', example: 'user.lock' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'action phải là chuỗi' })
  @MaxLength(100, { message: 'action tối đa 100 ký tự' })
  action?: string;

  @ApiPropertyOptional({ description: 'Loại đối tượng, ví dụ user', example: 'user' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'entity phải là chuỗi' })
  @MaxLength(50, { message: 'entity tối đa 50 ký tự' })
  entity?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Mã đối tượng bị tác động' })
  @IsOptional()
  @IsUUID('all', { message: 'entityId phải là UUID' })
  entityId?: string;
}

export const AUDIT_LOG_SORTS = ['createdAt:desc', 'createdAt:asc'] as const;
export type AuditLogSort = (typeof AUDIT_LOG_SORTS)[number];

// GET /admin/audit-logs
export class AuditLogQueryDto extends IntersectionType(PaginationQueryDto, AuditLogFilterDto) {
  @ApiPropertyOptional({ enum: AUDIT_LOG_SORTS, default: 'createdAt:desc' })
  @IsOptional()
  @IsIn(AUDIT_LOG_SORTS, { message: `sort thuộc: ${AUDIT_LOG_SORTS.join(', ')}` })
  sort: AuditLogSort = 'createdAt:desc';
}

export const AUDIT_EXPORT_FORMATS = ['csv', 'xlsx'] as const;
export type AuditExportFormat = (typeof AUDIT_EXPORT_FORMATS)[number];

// POST /admin/audit-logs/export
export class ExportAuditLogsDto extends AuditLogFilterDto {
  @ApiPropertyOptional({ enum: AUDIT_EXPORT_FORMATS, default: 'xlsx' })
  @IsOptional()
  @IsIn(AUDIT_EXPORT_FORMATS, { message: `format thuộc: ${AUDIT_EXPORT_FORMATS.join(', ')}` })
  format: AuditExportFormat = 'xlsx';
}
