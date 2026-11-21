import type { ReactNode } from 'react';
import {
  BadgeCheck,
  Briefcase,
  CircleAlert,
  CircleCheck,
  GraduationCap,
  KeyRound,
  UserRound,
} from 'lucide-react';
import type { AdminUserDetail } from '@/api/generated';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { SectionCard } from '@/features/profile/components/SectionCard';
import { formatDateTime, LEVEL_LABELS } from '@/features/profile/format';
import { cn } from '@/lib/utils';

/** Một dòng nhãn – giá trị; màn hẹp xếp chồng, từ sm nằm ngang */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground sm:text-right">{children}</dd>
    </div>
  );
}

const muted = 'font-normal text-subtle italic';

function Chip({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'neutral';
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'success' && 'bg-emerald-50 text-emerald-700',
        tone === 'warning' && 'bg-amber-50 text-amber-700',
        tone === 'neutral' && 'bg-slate-100 text-slate-700',
      )}
    >
      {children}
    </span>
  );
}

export function AccountInfoCard({ user }: { user: AdminUserDetail }) {
  return (
    <SectionCard icon={UserRound} title="Thông tin tài khoản">
      <dl className="-my-3 divide-y divide-border">
        <InfoRow label="Ngày tạo">{formatDateTime(user.createdAt)}</InfoRow>
        <InfoRow label="Xác minh email">
          {user.emailVerifiedAt ? (
            <Chip tone="success">
              <CircleCheck className="size-3.5" />
              Đã xác minh · {formatDateTime(user.emailVerifiedAt)}
            </Chip>
          ) : (
            <Chip tone="warning">
              <CircleAlert className="size-3.5" />
              Chưa xác minh
            </Chip>
          )}
        </InfoRow>
        <InfoRow label="Đồng ý điều khoản">
          {user.termsAcceptedAt ? (
            formatDateTime(user.termsAcceptedAt)
          ) : (
            <span className={muted}>Chưa ghi nhận</span>
          )}
        </InfoRow>
        <InfoRow label="Phương thức đăng nhập">
          <span className="inline-flex flex-wrap gap-1.5 sm:justify-end">
            {user.hasPassword && (
              <Chip tone="neutral">
                <KeyRound className="size-3.5" />
                Mật khẩu
              </Chip>
            )}
            {user.googleLinked && (
              <Chip tone="neutral">
                <GoogleIcon className="size-3.5" />
                Google
              </Chip>
            )}
          </span>
        </InfoRow>
        <InfoRow label="Đăng nhập gần nhất">
          {user.lastLoginAt ? (
            formatDateTime(user.lastLoginAt)
          ) : (
            <span className={muted}>Chưa đăng nhập</span>
          )}
        </InfoRow>
        {user.mustChangePassword && (
          <InfoRow label="Mật khẩu">
            <Chip tone="warning">Phải đổi khi đăng nhập</Chip>
          </InfoRow>
        )}
      </dl>
    </SectionCard>
  );
}

/** Hồ sơ riêng theo vai trò: học viên (trình độ, điểm) hoặc giáo viên (đơn vị, chuyên môn) */
export function RoleProfileCard({ user }: { user: AdminUserDetail }) {
  if (user.teacher) {
    const { teacher } = user;
    return (
      <SectionCard icon={Briefcase} title="Hồ sơ giáo viên">
        <dl className="-my-3 divide-y divide-border">
          <InfoRow label="Đơn vị công tác">{teacher.organization}</InfoRow>
          <InfoRow label="Chuyên môn">{teacher.specialization}</InfoRow>
          <InfoRow label="Duyệt hồ sơ">
            {teacher.isApproved ? (
              <Chip tone="success">
                <BadgeCheck className="size-3.5" />
                Đã duyệt
              </Chip>
            ) : (
              <Chip tone="warning">Chưa duyệt</Chip>
            )}
          </InfoRow>
        </dl>
      </SectionCard>
    );
  }

  const student = user.student;
  return (
    <SectionCard icon={GraduationCap} title="Hồ sơ học viên">
      <div className="grid grid-cols-2 gap-3">
        <ScoreTile label="Điểm hiện tại" value={student?.currentScore} />
        <ScoreTile label="Mục tiêu" value={student?.targetScore} highlight />
      </div>
      <dl className="mt-3 divide-y divide-border">
        <InfoRow label="Trình độ">
          {student?.currentLevel ? (
            LEVEL_LABELS[student.currentLevel]
          ) : (
            <span className={muted}>Chưa làm bài đánh giá</span>
          )}
        </InfoRow>
        <InfoRow label="Đồng ý ghi âm (Speaking)">
          {student?.voiceConsentAt ? (
            <Chip tone="success">
              <CircleCheck className="size-3.5" />
              Đã đồng ý · {formatDateTime(student.voiceConsentAt)}
            </Chip>
          ) : (
            <span className={muted}>Chưa đồng ý</span>
          )}
        </InfoRow>
      </dl>
    </SectionCard>
  );
}

function ScoreTile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: number | null;
  highlight?: boolean;
}) {
  return (
    <div className={cn('rounded-2xl p-4', highlight ? 'bg-accent' : 'bg-background')}>
      <p className="text-xs font-semibold tracking-wider text-subtle uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold tabular-nums',
          highlight ? 'text-brand' : 'text-foreground',
        )}
      >
        {value ?? '—'}
        {value != null && <span className="ml-1 text-xs font-medium text-subtle">/ 990</span>}
      </p>
    </div>
  );
}
