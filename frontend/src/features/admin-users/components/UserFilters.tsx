import { RotateCcw } from 'lucide-react';
import { SearchInput } from '@/features/exams/components/SearchInput';
import { FilterSelect, SegmentedControl } from '@/features/question-bank/components/FilterControls';
import type { UserStatus } from '@/api/generated';
import type { UserFilters as Filters } from '../hooks/use-user-filters';
import {
  MANAGED_ROLES,
  ROLE_META,
  SORT_OPTIONS,
  STATUS_META,
  USER_STATUSES,
  type AdminUserSort,
} from '../labels';

interface UserFiltersProps {
  filters: Filters;
  hasFilters: boolean;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

export function UserFilters({ filters, hasFilters, onChange, onClear }: UserFiltersProps) {
  return (
    <section
      aria-label="Bộ lọc người dùng"
      className="rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <SearchInput
          value={filters.q}
          onSearch={(q) => onChange({ q })}
          placeholder="Tìm theo họ tên hoặc email…"
          className="lg:flex-1"
        />

        <SegmentedControl
          label="Vai trò"
          value={filters.role}
          onChange={(role) => onChange({ role })}
          options={[
            { label: 'Tất cả' },
            ...MANAGED_ROLES.map((role) => ({ value: role, label: ROLE_META[role].label })),
          ]}
          className="flex lg:w-72"
        />

        <div className="grid grid-cols-2 gap-3 lg:flex lg:w-md">
          <FilterSelect
            label="Trạng thái"
            value={filters.status ?? ''}
            placeholder="Tất cả trạng thái"
            onChange={(value) =>
              onChange({ status: (value || undefined) as UserStatus | undefined })
            }
          >
            {USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Sắp xếp"
            value={filters.sort}
            onChange={(value) => onChange({ sort: value as AdminUserSort })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
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
