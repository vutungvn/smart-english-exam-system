import ExcelJS from 'exceljs';
import type { RoleCode } from '../../common/constants/roles.js';
import { actionLabel, entityLabel, ROLE_LABELS } from './audit-labels.js';
import type { AuditExportFormat } from './dto/audit-log-filter.dto.js';

/** Số dòng tối đa một lần xuất (xuất đồng bộ, D9) */
export const AUDIT_EXPORT_MAX_ROWS = 10_000;

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
// Excel cần BOM mới nhận CSV là UTF-8 (tiếng Việt có dấu)
const UTF8_BOM = String.fromCharCode(0xfeff);
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const AUDIT_EXPORT_CONTENT_TYPES: Record<AuditExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: XLSX_TYPE,
};

export interface AuditExportRow {
  createdAt: Date;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  actor: { fullName: string; email: string; role: RoleCode } | null;
}

const COLUMNS = [
  { header: 'Thời điểm', key: 'time', width: 20 },
  { header: 'Người thực hiện', key: 'actorName', width: 28 },
  { header: 'Email', key: 'actorEmail', width: 32 },
  { header: 'Vai trò', key: 'role', width: 16 },
  { header: 'Mã hành động', key: 'action', width: 22 },
  { header: 'Hành động', key: 'actionLabel', width: 36 },
  { header: 'Đối tượng', key: 'entity', width: 26 },
  { header: 'Mã đối tượng', key: 'entityId', width: 38 },
  { header: 'Địa chỉ IP', key: 'ip', width: 18 },
] as const;

type ColumnKey = (typeof COLUMNS)[number]['key'];
type FlatRow = Record<ColumnKey, string>;

// sv-SE cho dạng 2026-11-22 14:03:05, dễ sắp xếp trong Excel
const timeFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Thời điểm theo giờ Việt Nam, dạng yyyy-MM-dd HH:mm:ss */
export function formatVnTime(date: Date): string {
  return timeFormat.format(date);
}

function flatten(row: AuditExportRow): FlatRow {
  return {
    time: formatVnTime(row.createdAt),
    actorName: row.actor?.fullName ?? '(tài khoản đã xóa)',
    actorEmail: row.actor?.email ?? '',
    role: row.actor ? ROLE_LABELS[row.actor.role] : '',
    action: row.action,
    actionLabel: actionLabel(row.action),
    entity: entityLabel(row.entity),
    entityId: row.entityId ?? '',
    ip: row.ipAddress ?? '',
  };
}

/**
 * Một ô CSV: chặn CSV injection (ô bắt đầu bằng = + - @ tab, CR bị Excel hiểu là công thức,
 * mà họ tên do người dùng tự nhập) rồi bọc nháy kép khi có dấu phẩy, nháy kép, xuống dòng.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** CSV có BOM UTF-8 để Excel đọc đúng tiếng Việt, xuống dòng CRLF theo RFC 4180 */
export function buildAuditCsv(rows: AuditExportRow[]): Buffer {
  const lines = [
    COLUMNS.map((column) => csvCell(column.header)).join(','),
    ...rows.map((row) => {
      const flat = flatten(row);
      return COLUMNS.map((column) => csvCell(flat[column.key])).join(',');
    }),
  ];
  return Buffer.from(`${UTF8_BOM}${lines.join('\r\n')}\r\n`, 'utf8');
}

export async function buildAuditWorkbook(rows: AuditExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('nhat-ky', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = COLUMNS.map((column) => ({ ...column }));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };
  // exceljs ghi chuỗi thành ô văn bản, không phải công thức, nên không cần chặn injection như CSV
  for (const row of rows) sheet.addRow(flatten(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function buildAuditExport(
  format: AuditExportFormat,
  rows: AuditExportRow[],
): Promise<Buffer> {
  return format === 'csv' ? Promise.resolve(buildAuditCsv(rows)) : buildAuditWorkbook(rows);
}

/** Tên tệp theo giờ Việt Nam: audit-logs-20261122-1403.xlsx */
export function auditExportFileName(format: AuditExportFormat, now = new Date()): string {
  const stamp = formatVnTime(now).replaceAll('-', '').replace(' ', '-').replaceAll(':', '');
  return `audit-logs-${stamp.slice(0, 13)}.${format}`;
}
