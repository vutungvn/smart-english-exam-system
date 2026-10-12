import { useId, type ReactNode } from 'react';
import { NativeSelect } from '@/components/form/NativeSelect';
import { cn } from '@/lib/utils';

// Ô lọc dùng chung cho trang Ngân hàng câu hỏi và Nhóm câu hỏi

export function FilterSelect({
  label,
  value,
  disabled,
  placeholder,
  onChange,
  children,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  // Gắn nhãn bằng htmlFor: bọc <select> trong <label> làm tên ô bị lẫn chữ của các lựa chọn
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">
        {label}
      </label>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </NativeSelect>
    </div>
  );
}

/** Công tắc bật/tắt: checkbox thật (bàn phím, trình đọc màn hình) vẽ lại thành switch */
export function ToggleSwitch({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors hover:border-slate-300',
        className,
      )}
    >
      {label}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-5 w-9 shrink-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-primary peer-focus-visible:ring-3 peer-focus-visible:ring-primary/30 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  );
}

const segmentBase =
  'h-9 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-primary/30';

/** Nhóm nút chọn một (kỹ năng): ít lựa chọn nên hiện hết, không cần mở danh sách */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value?: T; label: ReactNode }[];
  value?: T;
  onChange: (value: T | undefined) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('gap-1 rounded-xl bg-slate-100 p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value ?? 'all'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              segmentBase,
              'flex-1',
              active ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
