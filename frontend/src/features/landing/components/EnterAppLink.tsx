import { Link } from 'react-router';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnterAppLinkProps {
  to: string;
  label: string;
  tone?: 'primary' | 'light'; // light: nền trắng, dùng trên khối gradient (CTA cuối trang)
  className?: string;
}

/**
 * Nút "Vào học ngay" cho người đã đăng nhập: vệt sáng lướt qua theo chu kỳ để gây chú ý;
 * rê chuột thì nút nhích lên, mũ tốt nghiệp nghiêng, mũi tên trượt sang phải.
 * Mọi chuyển động tắt khi người dùng chọn giảm chuyển động.
 */
export function EnterAppLink({ to, label, tone = 'primary', className }: EnterAppLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold whitespace-nowrap transition duration-300 motion-safe:hover:-translate-y-0.5 active:translate-y-0',
        tone === 'primary'
          ? 'bg-linear-to-r from-primary to-brand text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40'
          : 'bg-white text-brand shadow-lg shadow-black/10 hover:bg-blue-50',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent to-transparent motion-safe:animate-shine motion-reduce:hidden',
          tone === 'primary' ? 'via-white/35' : 'via-primary/15',
        )}
      />
      <GraduationCap className="relative size-4 shrink-0 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
      <span className="relative">{label}</span>
      <ArrowRight className="relative size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}
