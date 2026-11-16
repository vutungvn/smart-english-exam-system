import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Popover } from 'radix-ui';
import {
  Bell,
  BellOff,
  CheckCheck,
  CircleCheck,
  Clock,
  RotateCw,
  TriangleAlert,
  UserCheck,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useGetUnreadNotificationCountQuery,
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type NotificationItem,
  type NotificationType,
} from '@/api/generated';
import { useAppSelector } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { BELL_PAGE_SIZE, notificationLink, timeAgo } from './notification-meta';

const TYPE_ICONS: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  ATTEMPT_GRADED: { icon: CircleCheck, className: 'bg-success-soft text-success' },
  ATTEMPT_AUTO_SUBMITTED: { icon: Clock, className: 'bg-accent text-primary' },
  GRADING_FAILED: { icon: TriangleAlert, className: 'bg-danger-soft text-destructive' },
  TEACHER_REVIEWED: { icon: UserCheck, className: 'bg-violet-50 text-violet-700' },
};

/** Chuông ở thanh trên: chấm đỏ số chưa đọc, bấm mở danh sách thông báo mới nhất */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unread } = useGetUnreadNotificationCountQuery();
  const count = unread?.data.count ?? 0;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `Thông báo (${count} chưa đọc)` : 'Thông báo'}
          className="relative flex size-10 items-center justify-center rounded-xl text-slate-600 outline-none hover:bg-accent hover:text-brand focus-visible:ring-3 focus-visible:ring-primary/30 data-[state=open]:bg-accent data-[state=open]:text-brand"
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-bold text-white ring-2 ring-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 flex max-h-[min(32rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-slate-900/10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Chỉ tải danh sách khi mở chuông */}
          <NotificationPanel unreadCount={count} onNavigate={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NotificationPanel({
  unreadCount,
  onNavigate,
}: {
  unreadCount: number;
  onNavigate: () => void;
}) {
  const navigate = useNavigate();
  const role = useAppSelector(selectCurrentUser)?.role;
  const { data, error, isLoading, isFetching, refetch } = useListNotificationsQuery(
    { limit: BELL_PAGE_SIZE },
    { refetchOnMountOrArgChange: true },
  );
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const items = data?.data ?? [];

  const openItem = (item: NotificationItem) => {
    if (!item.readAt) void markRead(item.id);
    const link = notificationLink(item, role);
    if (link) {
      onNavigate();
      void navigate(link);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">
          Thông báo
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-destructive">
              {unreadCount} mới
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0 || markingAll}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <CheckCheck className="size-4" />
          Đọc tất cả
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <ul aria-hidden className="space-y-1 p-2">
            {[0, 1, 2].map((key) => (
              <li key={key} className="h-16 animate-pulse rounded-xl bg-background" />
            ))}
          </ul>
        ) : error && !data ? (
          <div role="alert" className="flex flex-col items-center px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">{toApiError(error).message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <RotateCw className="size-4" />
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
              <BellOff className="size-6" />
            </span>
            <p className="mt-3 font-medium text-foreground">Chưa có thông báo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Khi bài làm được chấm xong hoặc tự nộp lúc hết giờ, thông báo sẽ hiện ở đây.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const { icon: Icon, className } = TYPE_ICONS[item.type];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      'flex w-full gap-3 px-4 py-3 text-left outline-none hover:bg-accent/60 focus-visible:bg-accent',
                      !item.readAt && 'bg-primary/5',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl',
                        className,
                      )}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'text-sm text-foreground',
                            item.readAt ? 'font-medium' : 'font-semibold',
                          )}
                        >
                          {item.title}
                        </span>
                        {!item.readAt && (
                          <span
                            aria-label="Chưa đọc"
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm break-words text-muted-foreground">
                        {item.message}
                      </span>
                      <span className="mt-1 block text-xs text-subtle">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
