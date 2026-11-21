import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { skipToken } from '@reduxjs/toolkit/query';
import { Lock, LockOpen, RotateCw, Save, ShieldCheck } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useGetAdminUserQuery,
  useLockAdminUserMutation,
  useUnlockAdminUserMutation,
  useUpdateAdminUserMutation,
  type AdminUpdateUserDto,
  type AdminUserDetail,
  type AdminUserListItem,
} from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { inputClass, textareaClass } from '@/features/question-bank/form/styles';
import { applyFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { STATUS_META, statusAfterUnlock } from '../labels';

/** Người dùng đang được thao tác; null thì hộp thoại đóng */
interface ActionDialogProps {
  user: Pick<AdminUserListItem, 'id' | 'fullName' | 'email' | 'avatarUrl'> | null;
  onClose: () => void;
  /** Thành công: nơi gọi đóng hộp thoại và hiện thông báo */
  onDone: (message: string) => void;
}

const cancelButton = 'h-10 rounded-xl px-4';

// ---------------------------------------------------------------------------------------------
// Sửa thông tin

const REASON_MAX = 500;

// Luật khớp AdminUpdateUserDto ở backend; ô số giữ dạng chuỗi để ô trống không thành NaN
const editSchema = z
  .object({
    role: z.enum(['STUDENT', 'TEACHER']),
    fullName: z.string(),
    targetScore: z.string(),
    organization: z.string(),
    specialization: z.string(),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    const name = values.fullName.trim();
    if (name.length < 2 || name.length > 100) issue('fullName', 'Họ tên dài từ 2 đến 100 ký tự');

    if (values.role === 'STUDENT' && values.targetScore.trim()) {
      const score = Number(values.targetScore);
      if (!Number.isInteger(score) || score < 10 || score > 990 || score % 5 !== 0) {
        issue('targetScore', 'Điểm mục tiêu từ 10 đến 990, bước 5 điểm');
      }
    }
    if (values.role === 'TEACHER') {
      const length = (value: string) => value.trim().length;
      if (length(values.organization) < 2 || length(values.organization) > 255) {
        issue('organization', 'Đơn vị công tác dài từ 2 đến 255 ký tự');
      }
      if (length(values.specialization) < 2 || length(values.specialization) > 255) {
        issue('specialization', 'Chuyên môn dài từ 2 đến 255 ký tự');
      }
    }
  });

type EditValues = z.infer<typeof editSchema>;
const SERVER_FIELDS = ['fullName', 'targetScore', 'organization', 'specialization'] as const;

function toEditValues(user: AdminUserDetail): EditValues {
  return {
    role: user.role,
    fullName: user.fullName,
    targetScore: user.student?.targetScore ? String(user.student.targetScore) : '',
    organization: user.teacher?.organization ?? '',
    specialization: user.teacher?.specialization ?? '',
  };
}

/** Mở từ danh sách chỉ có id: tải chi tiết (cần updatedAt và hồ sơ theo vai trò) rồi mới hiện form */
export function EditUserDialog({ user, onClose, onDone }: ActionDialogProps) {
  const { data, error, refetch } = useGetAdminUserQuery(user?.id ?? skipToken);
  const detail = data?.data;
  const [busy, setBusy] = useState(false);
  // Gọi lại API thay vì đọc cache: sau 409 cache có thể chưa kịp tải lại bản mới
  const loadLatest = async () => (await refetch().unwrap()).data;

  return (
    <AppDialog
      open={user !== null}
      onOpenChange={(open) => !open && onClose()}
      busy={busy}
      title="Sửa thông tin người dùng"
      description="Thay đổi được lưu ngay và ghi vào nhật ký kiểm toán."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className={cancelButton}
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </Button>
          <SubmitButton
            form="edit-user-form"
            loading={busy}
            disabled={!detail}
            className="h-10 w-auto px-5 text-sm"
          >
            <Save />
            Lưu thay đổi
          </SubmitButton>
        </>
      }
    >
      {detail ? (
        // key: mở lại cho người khác thì tạo form mới, không giữ dữ liệu cũ
        <EditUserForm
          key={detail.id}
          user={detail}
          onBusyChange={setBusy}
          onDone={onDone}
          loadLatest={loadLatest}
        />
      ) : error ? (
        <FormAlert message={toApiError(error).message} />
      ) : (
        <div aria-hidden className="space-y-4">
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}
    </AppDialog>
  );
}

function EditUserForm({
  user,
  onBusyChange,
  onDone,
  loadLatest,
}: {
  user: AdminUserDetail;
  onBusyChange: (busy: boolean) => void;
  onDone: (message: string) => void;
  loadLatest: () => Promise<AdminUserDetail>;
}) {
  const [updateUser] = useUpdateAdminUserMutation();
  // Phiên bản lúc mở form; gửi kèm để server phát hiện có người sửa xen giữa (409)
  const [version, setVersion] = useState(user.updatedAt);
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(editSchema), defaultValues: toEditValues(user) });
  const formError = errors.root?.server?.message;

  const submit = async (values: EditValues) => {
    setConflict(false);
    onBusyChange(true);
    const body: AdminUpdateUserDto = { updatedAt: version, fullName: values.fullName.trim() };
    if (values.role === 'STUDENT' && values.targetScore.trim()) {
      body.targetScore = Number(values.targetScore);
    }
    if (values.role === 'TEACHER') {
      body.organization = values.organization.trim();
      body.specialization = values.specialization.trim();
    }

    try {
      await updateUser({ id: user.id, adminUpdateUserDto: body }).unwrap();
      onDone(`Đã lưu thông tin của ${body.fullName}`);
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'VERSION_CONFLICT') setConflict(true);
      else if (!applyFieldErrors(apiError, setError, SERVER_FIELDS)) {
        setError('root.server', { type: apiError.code, message: apiError.message });
      }
    } finally {
      onBusyChange(false);
    }
  };

  const reload = async () => {
    setReloading(true);
    try {
      const latest = await loadLatest();
      reset(toEditValues(latest));
      setVersion(latest.updatedAt);
      setConflict(false);
    } catch (err) {
      setConflict(false);
      setError('root.server', { message: toApiError(err).message });
    } finally {
      setReloading(false);
    }
  };

  return (
    <form id="edit-user-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
      {conflict && (
        <FormAlert message="Thông tin đã được thay đổi ở nơi khác. Tải bản mới nhất rồi sửa lại; thay đổi chưa lưu ở đây sẽ mất.">
          <button
            type="button"
            disabled={reloading}
            onClick={() => void reload()}
            className="inline-flex items-center gap-1 underline-offset-4 hover:underline disabled:opacity-60"
          >
            <RotateCw className={cn('size-3.5', reloading && 'animate-spin')} />
            {reloading ? 'Đang tải…' : 'Tải bản mới nhất'}
          </button>
        </FormAlert>
      )}
      {formError && <FormAlert message={formError} />}

      <div className="flex items-center gap-3 rounded-2xl bg-background p-3">
        <UserAvatar
          fullName={user.fullName}
          avatarUrl={user.avatarUrl}
          className="size-10 text-sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{user.email}</p>
          <p className="text-xs text-subtle">
            Email và vai trò không đổi được · {user.role === 'STUDENT' ? 'Học viên' : 'Giáo viên'}
          </p>
        </div>
      </div>

      <FormField id="edit-full-name" label="Họ và tên" required error={errors.fullName?.message}>
        <input
          id="edit-full-name"
          autoComplete="off"
          aria-invalid={!!errors.fullName}
          className={inputClass}
          {...register('fullName')}
        />
      </FormField>

      {user.role === 'STUDENT' && (
        <FormField
          id="edit-target-score"
          label="Điểm mục tiêu TOEIC"
          hint={<span className="text-xs text-subtle">Từ 10 đến 990, bước 5</span>}
          error={errors.targetScore?.message}
        >
          <input
            id="edit-target-score"
            type="number"
            inputMode="numeric"
            min={10}
            max={990}
            step={5}
            placeholder="Ví dụ: 750"
            aria-invalid={!!errors.targetScore}
            className={inputClass}
            {...register('targetScore')}
          />
        </FormField>
      )}

      {user.role === 'TEACHER' && (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="edit-organization"
            label="Đơn vị công tác"
            required
            error={errors.organization?.message}
          >
            <input
              id="edit-organization"
              aria-invalid={!!errors.organization}
              className={inputClass}
              {...register('organization')}
            />
          </FormField>
          <FormField
            id="edit-specialization"
            label="Chuyên môn"
            required
            error={errors.specialization?.message}
          >
            <input
              id="edit-specialization"
              aria-invalid={!!errors.specialization}
              className={inputClass}
              {...register('specialization')}
            />
          </FormField>
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------------------------
// Khóa, mở khóa

function TargetUser({ user }: { user: NonNullable<ActionDialogProps['user']> }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border p-3">
      <UserAvatar fullName={user.fullName} avatarUrl={user.avatarUrl} className="size-10 text-sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{user.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

export function LockUserDialog({ user, onClose, onDone }: ActionDialogProps) {
  const [lockUser] = useLockAdminUserMutation();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const close = () => {
    setReason('');
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    if (!user) return;
    setBusy(true);
    setError(undefined);
    try {
      const trimmed = reason.trim();
      await lockUser({ id: user.id, lockUserDto: trimmed ? { reason: trimmed } : {} }).unwrap();
      setReason('');
      onDone(`Đã khóa tài khoản ${user.fullName}`);
    } catch (err) {
      const apiError = toApiError(err);
      // Đã bị khóa ở tab khác: coi như xong
      if (apiError.code === 'USER_ALREADY_LOCKED') onDone(`Tài khoản ${user.fullName} đã bị khóa`);
      else setError(apiError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open={user !== null}
      onOpenChange={(open) => !open && close()}
      busy={busy}
      title="Khóa tài khoản?"
      description="Người dùng bị đăng xuất khỏi mọi thiết bị ngay lập tức và không đăng nhập được cho tới khi được mở khóa."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className={cancelButton}
            disabled={busy}
            onClick={close}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-destructive px-4 text-white hover:bg-destructive/90"
            disabled={busy}
            onClick={() => void confirm()}
          >
            <Lock />
            {busy ? 'Đang khóa…' : 'Khóa tài khoản'}
          </Button>
        </>
      }
    >
      {user && (
        <div className="space-y-4">
          {error && <FormAlert message={error} />}
          <TargetUser user={user} />
          <FormField
            id="lock-reason"
            label="Lý do (không bắt buộc)"
            hint={
              <span className="text-xs text-subtle tabular-nums">
                {reason.length}/{REASON_MAX}
              </span>
            }
          >
            <textarea
              id="lock-reason"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ví dụ: chia sẻ tài khoản cho người khác, đăng nhập bất thường…"
              className={cn(textareaClass, 'min-h-24')}
            />
          </FormField>
          <p className="flex items-center gap-1.5 text-xs text-subtle">
            <ShieldCheck className="size-3.5" />
            Lý do chỉ lưu trong nhật ký kiểm toán, người dùng không nhìn thấy.
          </p>
        </div>
      )}
    </AppDialog>
  );
}

export function UnlockUserDialog({ user, onClose, onDone }: ActionDialogProps) {
  // Trạng thái sau khi mở khóa phụ thuộc xác minh email và duyệt giáo viên: cần dữ liệu chi tiết
  const { data } = useGetAdminUserQuery(user?.id ?? skipToken);
  const [unlockUser] = useUnlockAdminUserMutation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const next = data ? statusAfterUnlock(data.data) : undefined;

  const close = () => {
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    if (!user) return;
    setBusy(true);
    setError(undefined);
    try {
      await unlockUser(user.id).unwrap();
      onDone(`Đã mở khóa tài khoản ${user.fullName}`);
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'USER_NOT_LOCKED') onDone(`Tài khoản ${user.fullName} đã được mở khóa`);
      else setError(apiError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open={user !== null}
      onOpenChange={(open) => !open && close()}
      busy={busy}
      title="Mở khóa tài khoản?"
      description="Người dùng đăng nhập lại được ngay sau khi mở khóa."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className={cancelButton}
            disabled={busy}
            onClick={close}
          >
            Hủy
          </Button>
          <SubmitButton
            type="button"
            loading={busy}
            className="h-10 w-auto px-5 text-sm"
            onClick={() => void confirm()}
          >
            {!busy && <LockOpen />}
            Mở khóa
          </SubmitButton>
        </>
      }
    >
      {user && (
        <div className="space-y-4">
          {error && <FormAlert message={error} />}
          <TargetUser user={user} />
          {next && (
            <p className="rounded-2xl bg-accent px-4 py-3 text-sm text-slate-700">
              Sau khi mở khóa, tài khoản trở về trạng thái{' '}
              <strong className="font-semibold text-foreground">{STATUS_META[next].label}</strong>
              {next === 'PENDING_VERIFICATION' &&
                ' vì chưa xác minh email. Người dùng cần xác minh email trước khi đăng nhập.'}
              {next === 'PENDING_APPROVAL' &&
                ' vì hồ sơ giáo viên chưa được duyệt. Duyệt hồ sơ ở mục Duyệt giáo viên.'}
              {next === 'ACTIVE' && '.'}
            </p>
          )}
        </div>
      )}
    </AppDialog>
  );
}
