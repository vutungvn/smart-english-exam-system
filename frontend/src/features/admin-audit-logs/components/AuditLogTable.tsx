import { ChevronRight, Globe } from 'lucide-react';
import type { AuditLogListItem } from '@/api/generated';
import { cn } from '@/lib/utils';
import { useAuditLabels } from '../hooks/use-audit-labels';
import { formatAuditTime, shortId } from '../labels';
import { ActionBadge, ActorCell, AuditRoleBadge } from './AuditBadges';

interface AuditLogTableProps {
  logs: AuditLogListItem[];
  /** Đang tải trang mới: làm mờ danh sách cũ thay vì nháy về khung xương */
  fetching: boolean;
  onOpen: (log: AuditLogListItem) => void;
}

function Time({ iso }: { iso: string }) {
  const { date, time } = formatAuditTime(iso);
  return (
    <time dateTime={iso} className="block tabular-nums">
      <span className="block font-medium text-foreground">{time}</span>
      <span className="block text-xs text-muted-foreground">{date}</span>
    </time>
  );
}

function EntityCell({ log }: { log: AuditLogListItem }) {
  const { entityLabel } = useAuditLabels();
  return (
    <div className="min-w-0">
      <p className="truncate text-slate-700">{entityLabel(log.entity)}</p>
      {log.entityId && (
        <p className="font-mono text-xs text-subtle" title={log.entityId}>
          #{shortId(log.entityId)}
        </p>
      )}
    </div>
  );
}

/**
 * Màn từ lg: bảng; hẹp hơn: danh sách thẻ. Bấm cả hàng (hoặc Enter khi focus nút) để mở chi tiết
 * trước/sau khi thay đổi
 */
export function AuditLogTable({ logs, fetching, onOpen }: AuditLogTableProps) {
  const { entityLabel } = useAuditLabels();
  return (
    <div aria-busy={fetching} className={cn('transition-opacity', fetching && 'opacity-60')}>
      <div className="relative hidden overflow-x-auto lg:block">
        <table className="w-full min-w-240 text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold tracking-wider whitespace-nowrap text-subtle uppercase">
              <th scope="col" className="py-3 pr-4 pl-5">
                Thời điểm
              </th>
              <th scope="col" className="px-4 py-3">
                Người thực hiện
              </th>
              <th scope="col" className="px-4 py-3">
                Vai trò
              </th>
              <th scope="col" className="px-4 py-3">
                Hành động
              </th>
              <th scope="col" className="px-4 py-3">
                Đối tượng
              </th>
              <th scope="col" className="px-4 py-3">
                Địa chỉ IP
              </th>
              <th scope="col" className="w-12 py-3 pr-5 pl-2">
                <span className="sr-only">Xem chi tiết</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr
                key={log.id}
                onClick={() => onOpen(log)}
                className="group cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="py-3.5 pr-4 pl-5 whitespace-nowrap">
                  <Time iso={log.createdAt} />
                </td>
                <td className="max-w-64 px-4 py-3.5">
                  <ActorCell actor={log.actor} />
                </td>
                <td className="px-4 py-3.5">
                  {log.actor ? (
                    <AuditRoleBadge role={log.actor.role} />
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </td>
                <td className="max-w-72 px-4 py-3.5">
                  <ActionBadge action={log.action} />
                </td>
                <td className="max-w-48 px-4 py-3.5">
                  <EntityCell log={log} />
                </td>
                <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap text-slate-600">
                  {log.ipAddress ?? '—'}
                </td>
                <td className="py-3 pr-5 pl-2 text-right">
                  {/* Nút thật cho bàn phím và trình đọc màn hình; cả hàng bấm được cho chuột */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(log);
                    }}
                    aria-label={`Xem chi tiết: ${log.action}, ${formatAuditTime(log.createdAt).time}`}
                    className="rounded-lg p-2 text-subtle transition-colors outline-none group-hover:text-primary hover:bg-accent focus-visible:ring-3 focus-visible:ring-primary/30"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border lg:hidden">
        {logs.map((log) => {
          const { date, time } = formatAuditTime(log.createdAt);
          return (
            <li key={log.id}>
              <button
                type="button"
                onClick={() => onOpen(log)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors outline-none hover:bg-slate-50 focus-visible:bg-accent"
              >
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <ActionBadge action={log.action} />
                    <time
                      dateTime={log.createdAt}
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                    >
                      {time} · {date}
                    </time>
                  </div>
                  <ActorCell actor={log.actor} />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {log.actor && <AuditRoleBadge role={log.actor.role} />}
                    <span>
                      {entityLabel(log.entity)}
                      {log.entityId && (
                        <span className="ml-1 font-mono text-subtle">#{shortId(log.entityId)}</span>
                      )}
                    </span>
                    {log.ipAddress && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Globe className="size-3" />
                        {log.ipAddress}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-subtle" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AuditLogTableSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="hidden w-20 space-y-1.5 lg:block">
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100 lg:w-1/3" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 lg:w-1/4" />
          </div>
          <div className="hidden h-6 w-24 animate-pulse rounded-full bg-slate-100 lg:block" />
          <div className="hidden h-6 w-40 animate-pulse rounded-lg bg-slate-100 md:block" />
          <div className="hidden h-4 w-24 animate-pulse rounded bg-slate-100 lg:block" />
        </div>
      ))}
    </div>
  );
}
