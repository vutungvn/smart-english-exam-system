import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectCheckboxProps {
  checked: boolean;
  /** Ô "chọn cả trang" khi mới chọn một phần */
  indeterminate?: boolean;
  disabled?: boolean;
  /** Lý do không chọn được, hiện khi rê chuột */
  disabledReason?: string;
  label: string;
  onChange: (checked: boolean) => void;
  className?: string;
}

/** Ô tích chọn mục để xóa nhiều; bấm vào không mở trang chi tiết của dòng/thẻ chứa nó */
export function SelectCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  disabledReason,
  label,
  onChange,
  className,
}: SelectCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    // Vùng bấm rộng hơn ô tích cho dễ chạm trên mobile
    <label
      title={disabled ? disabledReason : undefined}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-accent',
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 cursor-[inherit] rounded accent-primary disabled:opacity-40"
      />
    </label>
  );
}
