import type { ComponentProps } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SubmitButtonProps = ComponentProps<typeof Button> & { loading?: boolean };

export function SubmitButton({
  loading = false,
  disabled,
  className,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      aria-busy={loading}
      className={cn(
        'h-11 w-full rounded-xl bg-linear-to-r from-primary to-brand font-semibold shadow-md shadow-primary/30 hover:brightness-95 active:scale-[0.99]',
        className,
      )}
      {...props}
      disabled={loading || disabled}
    >
      {loading && <LoaderCircle className="animate-spin" />}
      {children}
    </Button>
  );
}
