import { UserX } from 'lucide-react';
import type { AuditLogActor, RoleCode } from '@/api/generated';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { useAuditLabels } from '../hooks/use-audit-labels';
import { actionMeta, ROLE_META } from '../labels';

const pillBase =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

export function AuditRoleBadge({ role }: { role: RoleCode }) {
  return <span className={cn(pillBase, ROLE_META[role].pill)}>{ROLE_META[role].label}</span>;
}

/** Huy hiệu hành động: biểu tượng + màu theo loại thao tác (khóa đỏ, mở khóa xanh...) */
export function ActionBadge({ action, className }: { action: string; className?: string }) {
  const { actionLabel } = useAuditLabels();
  const { icon: Icon, tone } = actionMeta(action);
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold',
        tone,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{actionLabel(action)}</span>
    </span>
  );
}

/** Người thực hiện: avatar, tên, email; tài khoản đã bị xóa thì hiện rõ thay vì để trống */
export function ActorCell({ actor }: { actor: AuditLogActor | null }) {
  if (!actor) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-subtle">
          <UserX className="size-4" />
        </span>
        <span className="text-sm text-subtle italic">Tài khoản đã bị xóa</span>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar fullName={actor.fullName} className="size-9 text-xs" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{actor.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{actor.email}</p>
      </div>
    </div>
  );
}
