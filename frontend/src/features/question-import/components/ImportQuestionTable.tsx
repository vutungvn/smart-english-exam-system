import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Headphones, ImageIcon } from 'lucide-react';
import type { ImportQuestionRow } from '@/api/generated';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

/** Các câu hợp lệ sẽ được nhập, phân trang ở trình duyệt (tối đa 2000 câu) */
export function ImportQuestionTable({ rows }: { rows: ImportQuestionRow[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  if (rows.length === 0) {
    return <p className="px-5 py-12 text-center text-sm text-subtle">Chưa có câu hợp lệ nào.</p>;
  }

  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold tracking-wider text-subtle uppercase">
              <th className="px-6 py-3 text-right font-semibold">Dòng</th>
              <th className="px-3 py-3 font-semibold">Mã câu</th>
              <th className="px-3 py-3 font-semibold">Part</th>
              <th className="px-3 py-3 font-semibold">Chủ đề</th>
              <th className="px-3 py-3 font-semibold">Nhóm</th>
              <th className="px-3 py-3 font-semibold">Nội dung</th>
              <th className="px-6 py-3 font-semibold">Media</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((row) => (
              <tr key={row.row}>
                <td className="px-6 py-3 text-right text-subtle tabular-nums">{row.row}</td>
                <td className="px-3 py-3 font-mono text-xs font-semibold whitespace-nowrap text-foreground">
                  {row.code}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <SkillPill skill={row.skill} className="mr-1.5" />
                  <span className="font-semibold text-slate-700">P{row.part}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{row.topic}</td>
                <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                  {row.groupCode ? `${row.groupCode} · câu ${row.orderInGroup}` : '—'}
                </td>
                <td className="max-w-80 truncate px-3 py-3 text-foreground" title={row.content}>
                  {row.content}
                </td>
                <td className="px-6 py-3">
                  <MediaIcons row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {shown.map((row) => (
          <li key={row.row} className="space-y-2 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-subtle">Dòng {row.row}</span>
              <span className="font-mono font-semibold text-foreground">{row.code}</span>
              <SkillPill skill={row.skill} />
              <span className="font-semibold text-slate-700">P{row.part}</span>
              <MediaIcons row={row} />
            </div>
            <p className="line-clamp-2 text-sm text-foreground">{row.content}</p>
            <p className="text-xs text-subtle">
              {row.topic}
              {row.groupCode && ` · ${row.groupCode} câu ${row.orderInGroup}`}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-subtle sm:px-6">
        <span>
          {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} /{' '}
          {rows.length} câu
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <PageButton
              label="Trang trước"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="size-4" />
            </PageButton>
            <span className="px-2 font-semibold text-foreground tabular-nums">
              {current}/{totalPages}
            </span>
            <PageButton
              label="Trang sau"
              disabled={current === totalPages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight className="size-4" />
            </PageButton>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaIcons({ row }: { row: ImportQuestionRow }) {
  if (!row.audioFile && !row.imageFile) return <span className="text-subtle">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-primary">
      {row.audioFile && (
        <span title={row.audioFile}>
          <Headphones className="size-4" aria-label={`Âm thanh ${row.audioFile}`} />
        </span>
      )}
      {row.imageFile && (
        <span title={row.imageFile}>
          <ImageIcon className="size-4" aria-label={`Hình ảnh ${row.imageFile}`} />
        </span>
      )}
    </span>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-lg border border-border bg-white text-slate-600 hover:bg-accent',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}
