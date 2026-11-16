import { useState } from 'react';
import { ChevronDown, CircleAlert, CircleCheck, X } from 'lucide-react';
import type { BulkOutcome } from './bulk-outcome';
import { cn } from '@/lib/utils';

/** Kết quả xóa nhiều: số đã xóa, và danh sách mục bị bỏ qua kèm lý do (mở/đóng được) */
export function BulkResultBanner({
  outcome,
  onClose,
}: {
  outcome: BulkOutcome;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const warn = outcome.nothingDeleted;
  const Icon = warn ? CircleAlert : CircleCheck;

  return (
    <div
      role="status"
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm',
        warn
          ? 'border-amber-300/60 bg-amber-50 text-amber-800'
          : 'border-success/25 bg-success-soft text-success',
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{outcome.message}</p>
          {outcome.skipped.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
            >
              Bỏ qua {outcome.skipped.length} mục, xem lý do
              <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="rounded-md p-1 hover:bg-black/5"
        >
          <X className="size-4" />
        </button>
      </div>

      {open && (
        <ul className="mt-3 max-h-60 space-y-1.5 overflow-y-auto rounded-xl bg-white/80 p-3 text-slate-700">
          {outcome.skipped.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <span className="font-semibold break-all text-foreground sm:max-w-64 sm:truncate">
                {item.label ?? 'Không xác định'}
              </span>
              <span className="text-muted-foreground">{item.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
