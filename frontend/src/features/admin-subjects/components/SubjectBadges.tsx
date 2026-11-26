import { ShieldCheck } from 'lucide-react';
import type { SubjectCategory } from '@/api/generated';
import { cn } from '@/lib/utils';
import { CATEGORY_META } from '../labels';

const pillBase =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

export function CategoryBadge({ category }: { category: SubjectCategory }) {
  const meta = CATEGORY_META[category];
  return <span className={cn(pillBase, meta.pill)}>{meta.label}</span>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        pillBase,
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-400')}
      />
      {active ? 'Đang dùng' : 'Đang ẩn'}
    </span>
  );
}

export function ProtectedBadge() {
  return (
    <span
      title="Chương trình hệ thống: không ẩn, không xóa được"
      className={cn(pillBase, 'bg-amber-50 text-amber-700')}
    >
      <ShieldCheck className="size-3.5" />
      Hệ thống
    </span>
  );
}
