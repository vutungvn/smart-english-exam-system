import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type IconInputProps = ComponentProps<'input'> & {
  icon: ReactNode;
  endAdornment?: ReactNode;
};

export function IconInput({ icon, endAdornment, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-slate-400 [&_svg]:size-4"
      >
        {icon}
      </span>
      <Input
        className={cn(
          'h-11 rounded-xl border-input bg-slate-50/70 pl-10 text-base shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-primary/20 md:text-sm',
          'aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20',
          endAdornment ? 'pr-11' : 'pr-4',
          className,
        )}
        {...props}
      />
      {endAdornment && (
        <span className="absolute top-1/2 right-1.5 -translate-y-1/2">{endAdornment}</span>
      )}
    </div>
  );
}
