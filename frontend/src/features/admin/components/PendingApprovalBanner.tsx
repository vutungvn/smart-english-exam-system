import { ArrowRight, UserCheck } from 'lucide-react';
import { ButtonLink } from '@/components/ButtonLink';
import { formatNumber, PENDING_TEACHERS_PATH } from '../dashboard-meta';

/** Nhắc admin còn giáo viên chờ duyệt (theo Stitch, khối "Cần phê duyệt"); không có thì ẩn */
export function PendingApprovalBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <section
      aria-label="Việc cần xử lý"
      className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50/70 p-5 sm:flex-row sm:items-center"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <UserCheck className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-bold text-foreground">
          {formatNumber(count)} giáo viên đang chờ duyệt
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Giáo viên chỉ đăng nhập và soạn đề được sau khi quản trị viên duyệt hồ sơ.
        </p>
      </div>
      <ButtonLink to={PENDING_TEACHERS_PATH} className="gap-2 px-4 sm:w-auto">
        Xem danh sách chờ duyệt
        <ArrowRight className="size-4" />
      </ButtonLink>
    </section>
  );
}
