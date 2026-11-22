import { useId } from 'react';
import { RotateCcw } from 'lucide-react';
import { SearchInput } from '@/features/exams/components/SearchInput';
import { FilterSelect, SegmentedControl } from '@/features/question-bank/components/FilterControls';
import {
  QUICK_RANGES,
  type AuditLogFilters as Filters,
  type QuickRange,
} from '../hooks/use-audit-log-filters';
import type { AuditFilterOption } from '@/api/generated';
import { SORT_OPTIONS, type AuditLogSort } from '../labels';

interface AuditLogFiltersProps {
  filters: Filters;
  options: { actions: AuditFilterOption[]; entities: AuditFilterOption[] };
  /** Đang tải danh sách hành động, đối tượng: khóa hai ô chọn */
  optionsLoading?: boolean;
  quickRange?: QuickRange;
  hasFilters: boolean;
  onChange: (patch: Partial<Filters>) => void;
  onQuickRange: (range: QuickRange | undefined) => void;
  onClear: () => void;
}

const dateInput =
  'h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-foreground tabular-nums outline-none transition-colors hover:border-slate-300 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20';

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value?: string;
  min?: string;
  max?: string;
  onChange: (value: string | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={dateInput}
      />
    </div>
  );
}

export function AuditLogFilters({
  filters,
  options,
  optionsLoading = false,
  quickRange,
  hasFilters,
  onChange,
  onQuickRange,
  onClear,
}: AuditLogFiltersProps) {
  return (
    <section
      aria-label="Bộ lọc nhật ký"
      className="space-y-4 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <SearchInput
          value={filters.q}
          onSearch={(q) => onChange({ q })}
          placeholder="Tìm người thực hiện theo họ tên hoặc email…"
          className="lg:flex-1"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:w-xl">
          <FilterSelect
            label="Hành động"
            value={filters.action ?? ''}
            disabled={optionsLoading}
            placeholder="Tất cả hành động"
            onChange={(value) => onChange({ action: value || undefined })}
          >
            {options.actions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Đối tượng"
            value={filters.entity ?? ''}
            disabled={optionsLoading}
            placeholder="Tất cả đối tượng"
            onChange={(value) => onChange({ entity: value || undefined, entityId: undefined })}
          >
            {options.entities.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700">Thời gian</span>
          <SegmentedControl
            label="Khoảng thời gian"
            value={quickRange}
            onChange={onQuickRange}
            options={[
              { label: 'Tất cả' },
              ...QUICK_RANGES.map((range) => ({ value: range.key, label: range.label })),
            ]}
            className="flex lg:w-80"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-1">
          <DateField
            label="Từ ngày"
            value={filters.from}
            max={filters.to}
            onChange={(from) => onChange({ from })}
          />
          <DateField
            label="Đến ngày"
            value={filters.to}
            min={filters.from}
            onChange={(to) => onChange({ to })}
          />
          <div className="col-span-2 lg:w-48">
            <FilterSelect
              label="Sắp xếp"
              value={filters.sort}
              onChange={(value) => onChange({ sort: value as AuditLogSort })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold whitespace-nowrap text-primary transition-colors hover:bg-accent"
          >
            <RotateCcw className="size-4" />
            Xóa bộ lọc
          </button>
        )}
      </div>
    </section>
  );
}
