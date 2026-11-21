import type { ManagedRole, UserStatus } from '@/api/generated';
import { cn } from '@/lib/utils';
import { ROLE_META, STATUS_META } from '../labels';

const pillBase =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

export function RoleBadge({ role }: { role: ManagedRole }) {
  return <span className={cn(pillBase, ROLE_META[role].pill)}>{ROLE_META[role].label}</span>;
}

export function StatusBadge({ status }: { status: UserStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn(pillBase, meta.pill)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}
