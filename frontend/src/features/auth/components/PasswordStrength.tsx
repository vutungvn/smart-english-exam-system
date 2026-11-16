import { Check, Circle, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PASSWORD_RULES } from '../password-rules';

// compact: từ sm, màn hình chưa đủ cao (< 821px) thì dồn 4 điều kiện về 1 dòng với nhãn ngắn
export function PasswordStrength({ value, compact }: { value: string; compact?: boolean }) {
  const passed = PASSWORD_RULES.map((rule) => rule.test(value));
  const score = passed.filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div aria-hidden className="flex gap-1.5">
        {PASSWORD_RULES.map((rule, i) => (
          <span
            key={rule.label}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < score
                ? score === PASSWORD_RULES.length
                  ? 'bg-success'
                  : 'bg-primary'
                : 'bg-accent',
            )}
          />
        ))}
      </div>
      <ul
        className={cn(
          'grid grid-cols-2 gap-x-2 gap-y-1',
          compact && 'sm:not-tall:flex sm:not-tall:justify-between',
        )}
      >
        {PASSWORD_RULES.map((rule, i) => (
          <li
            key={rule.label}
            title={rule.label}
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap',
              passed[i] ? 'text-success' : 'text-subtle',
            )}
          >
            {passed[i] ? <Check className="size-3" /> : <Circle className="size-3" />}
            {compact ? (
              <>
                <span className="sm:not-tall:hidden">{rule.label}</span>
                <span className="hidden sm:not-tall:inline">{rule.short}</span>
              </>
            ) : (
              rule.label
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PasswordMatchHint({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm || password !== confirm) return null;
  return (
    <p className="flex items-center gap-1 px-1 text-[11px] font-medium text-success">
      <CircleCheck className="size-3" />
      Mật khẩu trùng khớp
    </p>
  );
}
