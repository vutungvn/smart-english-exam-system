import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { title: 'Tải tệp lên', hint: 'Chọn tệp .zip câu hỏi' },
  { title: 'Xem trước & kiểm tra', hint: 'Rà soát lỗi theo dòng, cột' },
  { title: 'Hoàn tất', hint: 'Lưu vào ngân hàng' },
] as const;

/** current: 0, 1, 2. Bước trước current hiện dấu tích xanh */
export function ImportStepper({ current }: { current: number }) {
  return (
    <ol
      aria-label="Các bước nhập câu hỏi"
      className="flex items-center gap-2 rounded-3xl border border-border bg-white px-4 py-4 shadow-2xs sm:gap-4 sm:px-6"
    >
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <Fragment key={step.title}>
            {index > 0 && (
              <li
                aria-hidden
                className={cn(
                  'h-0.5 min-w-4 flex-1 rounded-full',
                  done || active ? 'bg-success/60' : 'bg-border',
                )}
              />
            )}
            <li
              aria-current={active ? 'step' : undefined}
              className="flex shrink-0 items-center gap-3"
            >
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-sm font-bold',
                  done && 'bg-success text-white',
                  active && 'bg-primary text-white shadow-md shadow-primary/30',
                  !done && !active && 'border-2 border-border text-subtle',
                )}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </span>
              {/* Màn hẹp chỉ hiện tên bước đang làm cho đỡ chật */}
              <span className={cn('min-w-0', !active && 'hidden md:block')}>
                <span
                  className={cn(
                    'block text-sm font-semibold',
                    active ? 'text-foreground' : done ? 'text-success' : 'text-subtle',
                  )}
                >
                  {step.title}
                </span>
                <span className={cn('block text-xs', active ? 'text-primary' : 'text-subtle')}>
                  {step.hint}
                </span>
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
