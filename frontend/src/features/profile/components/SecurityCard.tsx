import { Link } from 'react-router';
import {
  ArrowRight,
  Check,
  KeyRound,
  Monitor,
  RotateCw,
  Shield,
  Smartphone,
  X,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetLoginHistoryQuery } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { describeFailure, describeUserAgent, formatDateTime } from '../format';
import { SectionCard } from './SectionCard';

const HISTORY_LIMIT = 5;

export function SecurityCard() {
  const { data, isLoading, error, refetch, isFetching } = useGetLoginHistoryQuery({
    page: 1,
    limit: HISTORY_LIMIT,
  });
  const items = data?.data ?? [];

  return (
    <SectionCard
      icon={Shield}
      title="Bảo mật & đăng nhập"
      description="Quản lý mật khẩu và theo dõi các lần đăng nhập vào tài khoản"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-2xs">
            <KeyRound className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Mật khẩu</p>
            <p className="text-sm text-muted-foreground">
              Đổi mật khẩu định kỳ để bảo vệ tài khoản
            </p>
          </div>
        </div>
        <Link
          to="/app/profile/password"
          className="inline-flex h-10 w-fit items-center gap-1.5 rounded-xl border border-primary/30 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-accent"
        >
          Đổi mật khẩu
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold tracking-wider text-foreground uppercase">
          Lịch sử đăng nhập gần đây
        </h3>
        {data && (
          <span className="text-xs text-subtle">
            {data.meta.total > 0
              ? `${Math.min(HISTORY_LIMIT, data.meta.total)} / ${data.meta.total} lần gần nhất`
              : ''}
          </span>
        )}
      </div>

      {/* Màn hẹp: bảng cuộn ngang trong khung, không làm tràn trang */}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-160 text-sm">
          <thead className="bg-background text-left text-xs font-semibold text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Thời gian
              </th>
              <th scope="col" className="px-4 py-3">
                Thiết bị / Trình duyệt
              </th>
              <th scope="col" className="px-4 py-3">
                Địa chỉ IP
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Kết quả
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading &&
              Array.from({ length: 3 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-3">
                    <span className="block h-5 animate-pulse rounded-md bg-slate-100" />
                  </td>
                </tr>
              ))}

            {error && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  <p>{toApiError(error).message}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-lg"
                    disabled={isFetching}
                    onClick={() => void refetch()}
                  >
                    <RotateCw className={cn(isFetching && 'animate-spin')} />
                    Thử lại
                  </Button>
                </td>
              </tr>
            )}

            {data && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Chưa có lịch sử đăng nhập
                </td>
              </tr>
            )}

            {items.map((item, index) => {
              const device = describeUserAgent(item.userAgent);
              const DeviceIcon = device.mobile ? Smartphone : Monitor;
              return (
                <tr key={item.id} className={cn(!item.success && 'bg-danger-soft/40')}>
                  <td
                    className={cn(
                      'px-4 py-3 whitespace-nowrap',
                      item.success ? 'text-foreground' : 'text-destructive',
                    )}
                  >
                    {formatDateTime(item.createdAt)}
                    {index === 0 && item.success && (
                      <span className="ml-2 rounded-md bg-skill-listening/12 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Mới nhất
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">
                    <span className="flex items-center gap-2">
                      <DeviceIcon className="size-4 text-subtle" />
                      {device.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {item.ipAddress ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {item.success ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-skill-listening/12 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <Check className="size-3.5" />
                        Thành công
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-destructive">
                        <X className="size-3.5" />
                        {describeFailure(item.failureReason)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
