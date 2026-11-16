import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NativeSelect } from './form/NativeSelect';

interface PaginationProps {
  page: number;
  totalPages: number;
  limit: number;
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/** Danh sách số trang có dấu "…": 1 … 4 5 6 … 12 */
function pageItems(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) items.push('gap');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push('gap');
  items.push(total);
  return items;
}

const pageButton =
  'flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

export function Pagination({
  page,
  totalPages,
  limit,
  pageSizes,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Trang <span className="font-semibold text-foreground">{page}</span> /{' '}
        {Math.max(1, totalPages)}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <NativeSelect
          aria-label="Số dòng mỗi trang"
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="w-28"
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size} / trang
            </option>
          ))}
        </NativeSelect>

        <nav aria-label="Phân trang" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={cn(pageButton, 'text-slate-600 hover:bg-accent')}
          >
            <ChevronLeft className="size-4" />
          </button>
          {pageItems(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="px-1 text-subtle">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  pageButton,
                  item === page
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'text-slate-600 hover:bg-accent',
                )}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label="Trang sau"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={cn(pageButton, 'text-slate-600 hover:bg-accent')}
          >
            <ChevronRight className="size-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
