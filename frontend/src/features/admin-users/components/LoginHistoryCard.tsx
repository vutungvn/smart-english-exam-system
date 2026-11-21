import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, History, Monitor, Smartphone, X } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetAdminUserLoginHistoryQuery } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/features/profile/components/SectionCard';
import { describeFailure, describeUserAgent, formatDateTime } from '@/features/profile/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

const pageButton =
  'inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40';

export function LoginHistoryCard({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isFetching, refetch } = useGetAdminUserLoginHistoryQuery({
    id: userId,
    page,
    limit: PAGE_SIZE,
  });
  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <SectionCard
      icon={History}
      title="Lịch sử đăng nhập"
      description="Mỗi lần đăng nhập thành công hoặc thất bại, mới nhất trước"
      action={
        meta && meta.total > 0 ? (
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-brand">
            {meta.total} lần
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div aria-hidden className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error && !data ? (
        <div role="alert" className="py-6 text-center text-sm text-muted-foreground">
          <p>{toApiError(error).message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 rounded-lg"
            onClick={() => void refetch()}
          >
            Thử lại
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Người dùng này chưa đăng nhập lần nào.
        </p>
      ) : (
        <ul
          aria-busy={isFetching}
          className={cn('-my-1 divide-y divide-border', isFetching && 'opacity-60')}
        >
          {items.map((item) => {
            const device = describeUserAgent(item.userAgent);
            const DeviceIcon = device.mobile ? Smartphone : Monitor;
            return (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                    item.success
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-danger-soft text-destructive',
                  )}
                >
                  {item.success ? <Check className="size-4" /> : <X className="size-4" />}
                  <span className="sr-only">{item.success ? 'Thành công' : 'Thất bại'}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <DeviceIcon className="size-4 shrink-0 text-subtle" />
                    <span className="truncate">{device.label}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {item.ipAddress ?? 'Không rõ IP'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-foreground tabular-nums">
                    {formatDateTime(item.createdAt)}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-xs font-medium',
                      item.success ? 'text-emerald-700' : 'text-destructive',
                    )}
                  >
                    {item.success ? 'Thành công' : describeFailure(item.failureReason)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Trang <span className="font-semibold text-foreground">{page}</span> / {meta.totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              className={pageButton}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
              Trước
            </button>
            <button
              type="button"
              className={pageButton}
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
