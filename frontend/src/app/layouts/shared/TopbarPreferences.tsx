import type { ReactNode } from 'react';
import { DropdownMenu } from 'radix-ui';
import { Check, Languages, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// TẠM: chưa làm đa ngôn ngữ và giao diện tối, chỉ dựng sẵn chỗ trên thanh trên.
// Lựa chọn hiện tại cố định (Tiếng Việt, Sáng), các lựa chọn khác khóa kèm nhãn "Sắp có".

interface PreferenceOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
  available: boolean;
}

const LANGUAGES: PreferenceOption[] = [
  { value: 'vi', label: 'Tiếng Việt', hint: 'VI', available: true },
  { value: 'en', label: 'English', hint: 'EN', available: false },
];

const THEMES: PreferenceOption[] = [
  { value: 'light', label: 'Sáng', icon: Sun, available: true },
  { value: 'dark', label: 'Tối', icon: Moon, available: false },
  { value: 'system', label: 'Theo hệ thống', icon: Monitor, available: false },
];

const triggerClass =
  'flex h-10 items-center justify-center gap-1.5 rounded-xl text-slate-600 outline-none hover:bg-accent hover:text-brand focus-visible:ring-3 focus-visible:ring-primary/30 data-[state=open]:bg-accent data-[state=open]:text-brand';

export function LanguageMenu() {
  return (
    <PreferenceMenu
      label="Ngôn ngữ"
      options={LANGUAGES}
      value="vi"
      trigger={
        <button
          type="button"
          aria-label="Ngôn ngữ: Tiếng Việt"
          className={cn(triggerClass, 'w-10 sm:w-auto sm:px-2.5')}
        >
          <Languages className="size-5" />
          <span className="hidden text-xs font-bold sm:inline">VI</span>
        </button>
      }
    />
  );
}

export function ThemeMenu() {
  return (
    <PreferenceMenu
      label="Giao diện"
      options={THEMES}
      value="light"
      trigger={
        <button type="button" aria-label="Giao diện: Sáng" className={cn(triggerClass, 'w-10')}>
          <Sun className="size-5" />
        </button>
      }
    />
  );
}

interface PreferenceMenuProps {
  label: string;
  options: PreferenceOption[];
  value: string;
  trigger: ReactNode;
}

function PreferenceMenu({ label, options, value, trigger }: PreferenceMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-56 rounded-2xl border border-border bg-white p-1.5 shadow-xl shadow-slate-900/10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="px-3 pt-1.5 pb-1 text-[11px] font-bold tracking-wider text-subtle uppercase">
            {label}
          </DropdownMenu.Label>

          <DropdownMenu.RadioGroup value={value}>
            {options.map(
              ({ value: optionValue, label: optionLabel, icon: Icon, hint, available }) => (
                <DropdownMenu.RadioItem
                  key={optionValue}
                  value={optionValue}
                  disabled={!available}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground outline-none select-none data-disabled:cursor-default data-disabled:text-subtle data-highlighted:bg-accent data-highlighted:text-brand"
                >
                  {Icon ? (
                    <Icon className="size-4" />
                  ) : (
                    <span className="w-5 text-[11px] font-bold text-subtle">{hint}</span>
                  )}
                  <span className="flex-1">{optionLabel}</span>
                  {available ? (
                    <DropdownMenu.ItemIndicator>
                      <Check className="size-4 text-primary" />
                    </DropdownMenu.ItemIndicator>
                  ) : (
                    <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-semibold text-subtle">
                      Sắp có
                    </span>
                  )}
                </DropdownMenu.RadioItem>
              ),
            )}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
