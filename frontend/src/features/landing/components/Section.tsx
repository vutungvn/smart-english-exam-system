import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

// scroll-mt: chừa chỗ cho header dính khi bấm link neo trên menu
export function Section({ id, className, children }: SectionProps) {
  return (
    <section id={id} className={cn('scroll-mt-16 py-20 lg:py-28', className)}>
      <div className="mx-auto w-full max-w-300 px-4 sm:px-6">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  inverse?: boolean; // chữ trắng trên nền gradient
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  inverse = false,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('max-w-190', align === 'center' && 'mx-auto text-center', className)}>
      <span
        className={cn(
          'inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase',
          inverse ? 'border border-white/25 bg-white/15 text-white' : 'bg-accent text-primary',
        )}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          'mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl',
          inverse ? 'text-white' : 'text-foreground',
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-3 text-base leading-relaxed text-balance sm:text-lg',
            inverse ? 'text-blue-100' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
