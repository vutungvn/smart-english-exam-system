import { CalendarDays, Check, Clock } from 'lucide-react';
import type { MeProfile } from '@/api/generated';
import { BrandPattern } from '@/components/brand/BrandPattern';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { ROLE_LABELS } from '@/lib/user-display';
import { formatDate, formatDateTime } from '../format';
import { AvatarEditor } from './AvatarEditor';

// Thẻ danh tính: dải gradient thương hiệu, avatar (bấm để đổi ảnh) đè lên mép dưới dải
export function IdentityCard({ profile }: { profile: MeProfile }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs">
      <div className="relative h-24 overflow-hidden bg-linear-to-br from-brand via-primary to-primary-light">
        <BrandPattern />
      </div>

      <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
        <AvatarEditor fullName={profile.fullName} avatarUrl={profile.avatarUrl} />
        <h2 className="mt-4 text-xl font-bold text-foreground">{profile.fullName}</h2>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="break-all">{profile.email}</span>
          {profile.emailVerifiedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-skill-listening/12 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <Check className="size-3" />
              Đã xác minh
            </span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-brand">
            {ROLE_LABELS[profile.role]}
          </span>
          {profile.googleLinked && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              <GoogleIcon className="size-3.5" />
              Đã liên kết Google
            </span>
          )}
        </div>

        <ul className="mt-5 w-full space-y-2 border-t border-border pt-5 text-left text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            Tham gia từ{' '}
            <span className="font-semibold text-foreground">{formatDate(profile.createdAt)}</span>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            Đăng nhập gần nhất{' '}
            <span className="font-semibold text-foreground">
              {profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '—'}
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
