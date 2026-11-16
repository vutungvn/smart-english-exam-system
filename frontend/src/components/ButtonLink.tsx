import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: 'default' | 'secondary' | 'ghost';
};

// Link có giao diện nút; dùng buttonVariants thay vì asChild để không phụ thuộc thư viện nền
export function ButtonLink({ variant = 'default', className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        buttonVariants({ variant, size: 'lg' }),
        'h-11 w-full rounded-xl font-semibold',
        variant === 'default' && 'shadow-md',
        className,
      )}
      {...props}
    />
  );
}
