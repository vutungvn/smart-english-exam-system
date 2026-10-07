import { Link } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useAppSelector } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { getInitials, ROLE_LABELS } from '@/lib/user-display';
import { selectCurrentUser } from '@/store/slice/auth-slice';

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50';

// TẠM: trang Hồ sơ và Đổi mật khẩu đang là trang giữ chỗ; backend đã có PATCH /me, PATCH /me/password
const ACCOUNT_LINKS = [
  {
    to: '/app/profile',
    icon: UserRound,
    label: 'Hồ sơ cá nhân',
    hint: 'Họ tên, mục tiêu điểm',
  },
  {
    to: '/app/profile/password',
    icon: KeyRound,
    label: 'Đổi mật khẩu',
    hint: 'Cập nhật mật khẩu đăng nhập',
  },
];

function Avatar({ fullName, className }: { fullName: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 border-primary bg-accent font-bold text-brand',
        className,
      )}
    >
      {getInitials(fullName)}
    </span>
  );
}

// Menu tài khoản ở thanh trên: Radix lo phần bàn phím (mũi tên, Enter), Esc và bấm ra ngoài để đóng
export function UserMenu() {
  const user = useAppSelector(selectCurrentUser);
  const { logout, isLoggingOut } = useLogout();
  const fullName = user?.fullName ?? 'Học viên';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Tài khoản ${fullName}`}
          className="group flex items-center gap-3 rounded-xl p-1 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-primary/30 data-[state=open]:bg-accent sm:pr-2.5"
        >
          <Avatar fullName={fullName} className="size-10 text-sm" />
          <span className="hidden leading-tight sm:block">
            <span className="block max-w-40 truncate text-sm font-semibold text-foreground">
              {fullName}
            </span>
            {user && <span className="block text-xs text-subtle">{ROLE_LABELS[user.role]}</span>}
          </span>
          <ChevronDown className="hidden size-4 text-subtle transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-72 rounded-2xl border border-border bg-white p-2 shadow-xl shadow-slate-900/10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="flex items-center gap-3 rounded-xl bg-accent/70 p-3">
            <Avatar fullName={fullName} className="size-11" />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-foreground">{fullName}</span>
              {user && (
                <>
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  <span className="mt-1.5 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand">
                    {ROLE_LABELS[user.role]}
                  </span>
                </>
              )}
            </span>
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="my-2 h-px bg-border" />

          {ACCOUNT_LINKS.map(({ to, icon: Icon, label, hint }) => (
            <DropdownMenu.Item
              key={to}
              asChild
              className={cn(
                itemClass,
                'text-foreground data-highlighted:bg-accent data-highlighted:text-brand',
              )}
            >
              <Link to={to}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-slate-600">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{label}</span>
                  <span className="block truncate text-xs text-subtle">{hint}</span>
                </span>
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-2 h-px bg-border" />

          <DropdownMenu.Item
            disabled={isLoggingOut}
            onSelect={() => void logout()}
            className={cn(
              itemClass,
              'font-medium text-destructive data-highlighted:bg-danger-soft',
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger-soft">
              <LogOut className="size-4" />
            </span>
            Đăng xuất
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
