import { Link } from 'react-router';
import { ChevronRight, ScrollText } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useListAuditLogsQuery } from '@/api/generated';
import { ActionBadge } from '@/features/admin-audit-logs/components/AuditBadges';
import { AUDIT_LOGS_PATH, formatAuditTime } from '@/features/admin-audit-logs/labels';
import { cn } from '@/lib/utils';

const RECENT_LIMIT = 5;

/** 5 thao tác quản trị gần nhất (theo Stitch, khối "Nhật ký thao tác quản trị gần đây") */
export function RecentAuditCard({ className }: { className?: string }) {
  const { data, error, isLoading, refetch } = useListAuditLogsQuery({
    page: 1,
    limit: RECENT_LIMIT,
    sort: 'createdAt:desc',
  });
  const logs = data?.data ?? [];

  return (
    <section
      aria-labelledby="recent-audit-title"
      className={cn(
        'flex flex-col rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="recent-audit-title" className="text-lg font-bold text-foreground">
            Thao tác gần đây
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Nhật ký kiểm toán mới nhất</p>
        </div>
        <Link
          to={AUDIT_LOGS_PATH}
          className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary hover:text-brand"
        >
          Xem tất cả
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {isLoading ? (
        <ul aria-hidden className="mt-4 space-y-3">
          {Array.from({ length: RECENT_LIMIT }, (_, index) => (
            <li key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </ul>
      ) : error && !data ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 px-6 py-10 text-center text-sm text-muted-foreground">
          {toApiError(error).message}
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-semibold text-primary hover:text-brand"
          >
            Thử lại
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <ScrollText className="size-7 text-subtle" />
          <p className="text-sm text-muted-foreground">Chưa có thao tác quản trị nào.</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {logs.map((log) => {
            const { date, time } = formatAuditTime(log.createdAt);
            return (
              <li key={log.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <ActionBadge action={log.action} className="min-w-0" />
                  <time
                    dateTime={log.createdAt}
                    className="shrink-0 text-xs text-muted-foreground tabular-nums"
                  >
                    {time.slice(0, 5)} · {date.slice(0, 5)}
                  </time>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {log.actor ? (
                    <span className="font-medium text-foreground">{log.actor.fullName}</span>
                  ) : (
                    <span className="italic">Tài khoản đã bị xóa</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
