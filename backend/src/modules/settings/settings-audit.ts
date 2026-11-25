import type { AuditSnapshot } from '../../infra/audit/audit-context.js';
import type { ConversionPoint } from '../../infra/settings/settings.schema.js';

/** Bảng quy đổi ghi gọn "0→5, 10→20" cho dễ đọc trong nhật ký */
function auditValue(value: unknown): string | number {
  return Array.isArray(value)
    ? (value as ConversionPoint[]).map(({ raw, score }) => `${raw}→${score}`).join(', ')
    : Number(value);
}

/** Giá trị trước, sau của các tham số có thay đổi */
export function settingsDiff(
  before: object,
  after: object,
): { before: AuditSnapshot; after: AuditSnapshot } {
  const previous = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  const changed = Object.keys(next).filter(
    (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]),
  );
  const pick = (source: Record<string, unknown>): AuditSnapshot =>
    Object.fromEntries(changed.map((key) => [key, auditValue(source[key])]));
  return { before: pick(previous), after: pick(next) };
}
