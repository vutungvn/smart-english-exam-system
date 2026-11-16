import { useState } from 'react';
import type { ImportIssue } from '@/api/generated';
import { cn } from '@/lib/utils';
import { SHEET_META, SHEET_ORDER, type IssueSheet } from '../import-meta';

interface IssueTableProps {
  issues: ImportIssue[];
  /** Tổng số thật (response chỉ trả tối đa 500 dòng đầu) */
  total: number;
  tone: 'error' | 'warning';
}

/** Danh sách lỗi/cảnh báo, lọc theo sheet. Màn rộng là bảng, màn hẹp là thẻ */
export function IssueTable({ issues, total, tone }: IssueTableProps) {
  const [sheet, setSheet] = useState<IssueSheet>();
  const counts = SHEET_ORDER.map((key) => ({
    key,
    count: issues.filter((issue) => issue.sheet === key).length,
  })).filter((item) => item.count > 0);
  const shown = sheet ? issues.filter((issue) => issue.sheet === sheet) : issues;
  const columnPill =
    tone === 'error' ? 'bg-danger-soft text-destructive' : 'bg-amber-50 text-amber-700';

  if (issues.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-subtle sm:px-6">
        {tone === 'error' ? 'Không có lỗi nào.' : 'Không có cảnh báo nào.'}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 px-5 pt-4 sm:px-6">
        {[
          { key: undefined, label: `Tất cả (${issues.length})` },
          ...counts.map(({ key, count }) => ({
            key,
            label: `${key === 'media' ? 'Thư mục media' : key === 'file' ? 'Cấu trúc tệp' : `Sheet ${key}`} (${count})`,
          })),
        ].map((chip) => (
          <button
            key={chip.key ?? 'all'}
            type="button"
            aria-pressed={sheet === chip.key}
            onClick={() => setSheet(chip.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              sheet === chip.key
                ? 'border-primary bg-accent text-brand'
                : 'border-border bg-white text-slate-600 hover:border-slate-300',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Màn rộng: bảng */}
      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold tracking-wider text-subtle uppercase">
              <th className="px-6 py-3 font-semibold">Sheet</th>
              <th className="px-3 py-3 text-right font-semibold">Dòng</th>
              <th className="px-3 py-3 font-semibold">Cột</th>
              <th className="px-6 py-3 font-semibold">Nội dung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((issue, index) => (
              <tr key={index} className="align-top">
                <td className="px-6 py-3">
                  <SheetPill sheet={issue.sheet} />
                </td>
                <td className="px-3 py-3 text-right font-semibold text-foreground tabular-nums">
                  {issue.row ?? '—'}
                </td>
                <td className="px-3 py-3">
                  {issue.column ? (
                    <code className={cn('rounded-md px-2 py-0.5 font-mono text-xs', columnPill)}>
                      {issue.column}
                    </code>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-foreground">{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Màn hẹp: thẻ */}
      <ul className="mt-3 divide-y divide-border md:hidden">
        {shown.map((issue, index) => (
          <li key={index} className="space-y-2 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <SheetPill sheet={issue.sheet} />
              {issue.row !== null && (
                <span className="font-semibold text-foreground">Dòng {issue.row}</span>
              )}
              {issue.column && (
                <code className={cn('rounded-md px-2 py-0.5 font-mono', columnPill)}>
                  {issue.column}
                </code>
              )}
            </div>
            <p className="text-sm text-foreground">{issue.message}</p>
          </li>
        ))}
      </ul>

      {total > issues.length && (
        <p className="border-t border-border px-5 py-3 text-xs text-subtle sm:px-6">
          Đang hiện {issues.length}/{total} dòng đầu. Tải tệp danh sách để xem đầy đủ.
        </p>
      )}
    </div>
  );
}

function SheetPill({ sheet }: { sheet: IssueSheet }) {
  const meta = SHEET_META[sheet];
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold',
        meta.pill,
      )}
    >
      {meta.label}
    </span>
  );
}
