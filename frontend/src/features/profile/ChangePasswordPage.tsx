import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Check,
  CircleCheck,
  Clock,
  ExternalLink,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  MailCheck,
  Send,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { baseApi } from '@/api/base-api';
import { toApiError } from '@/api/errors';
import {
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useGetProfileQuery,
  useLoginMutation,
} from '@/api/generated';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { ButtonLink } from '@/components/ButtonLink';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Button } from '@/components/ui/button';
import { PasswordMatchHint, PasswordStrength } from '@/features/auth/components/PasswordStrength';
import { getMailbox, MAIL_SUBJECTS } from '@/features/auth/mailbox';
import { useAppDispatch, useAppSelector } from '@/hooks/hooks';
import { applyFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { selectCurrentUser, sessionCleared, sessionReceived } from '@/store/slice/auth-slice';
import { PageHeader } from './components/PageHeader';
import { SectionCard } from './components/SectionCard';
import { changePasswordSchema, type ChangePasswordValues } from './schemas';

const TIPS = [
  'Dùng ít nhất 12 ký tự',
  'Kết hợp chữ hoa, chữ thường và số',
  'Không dùng lại mật khẩu ở trang web khác',
  'Không dùng thông tin cá nhân như ngày sinh',
];

// Trang Đổi mật khẩu `/app/profile/password` (theo Stitch): PATCH /me/password.
// Tài khoản tạo bằng Google chưa có mật khẩu (hasPassword = false): tạo qua email đặt lại mật khẩu
export function ChangePasswordPage() {
  const user = useAppSelector(selectCurrentUser);
  const { data, isLoading } = useGetProfileQuery();
  const [done, setDone] = useState(false);
  // Lỗi tải hồ sơ thì vẫn hiện form: backend tự trả AUTH_PASSWORD_NOT_SET nếu chưa có mật khẩu
  const noPassword = data?.data.hasPassword === false;
  const title = noPassword ? 'Tạo mật khẩu' : 'Đổi mật khẩu';
  const email = user?.email ?? data?.data.email ?? '';

  let content;
  if (isLoading) {
    content = (
      <div aria-hidden className="h-120 animate-pulse rounded-3xl border border-border bg-white" />
    );
  } else if (noPassword) {
    content = <CreatePasswordCard email={email} />;
  } else if (done) {
    content = <ChangePasswordDone />;
  } else {
    content = <ChangePasswordForm onDone={() => setDone(true)} />;
  }

  return (
    <div className="mx-auto max-w-250 space-y-6">
      <title>{`${title} – Smart English Exam`}</title>
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/app' },
          { label: 'Hồ sơ cá nhân', to: '/app/profile' },
          { label: title },
        ]}
        backTo={{ label: 'Quay lại hồ sơ', to: '/app/profile' }}
        title={title}
        description={
          <>
            {noPassword ? 'Thêm mật khẩu đăng nhập' : 'Cập nhật mật khẩu đăng nhập'} cho tài khoản{' '}
            <span className="font-semibold break-all text-foreground">{email}</span>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {content}
        <PasswordTips />
      </div>
    </div>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const [changePassword] = useChangePasswordMutation();
  const [login] = useLoginMutation();
  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    formState: { errors, touchedFields, isSubmitting, isValid },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });
  const [newPassword, confirmPassword] = useWatch({
    control,
    name: ['newPassword', 'confirmPassword'],
  });
  const passwordsMatch = confirmPassword !== '' && newPassword === confirmPassword;
  const formError = errors.root?.server;

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePassword(values).unwrap();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'AUTH_CURRENT_PASSWORD_INCORRECT') {
        setError(
          'currentPassword',
          { type: 'server', message: apiError.message },
          { shouldFocus: true },
        );
        return;
      }
      const fields = ['currentPassword', 'newPassword', 'confirmPassword'] as const;
      if (applyFieldErrors(apiError, setError, fields)) return;
      setError('root.server', { type: apiError.code, message: apiError.message });
      return;
    }

    // Backend đã thu hồi mọi phiên, kể cả phiên của trình duyệt này: đăng nhập lại bằng
    // mật khẩu mới để người dùng không bị văng ra khi access token hết hạn
    try {
      const { data: session } = await login({
        email: user?.email ?? '',
        password: values.newPassword,
      }).unwrap();
      dispatch(sessionReceived(session));
      onDone();
    } catch {
      // Hiếm khi xảy ra (mất mạng ngay lúc đó): xóa phiên, yêu cầu đăng nhập lại bằng mật khẩu mới
      dispatch(sessionCleared());
      dispatch(baseApi.util.resetApiState());
      void navigate('/login', { replace: true });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionCard
        icon={KeyRound}
        title="Thiết lập mật khẩu mới"
        description="Bảo vệ tài khoản học tập với mật khẩu đạt độ bảo mật cao"
        footer={
          <>
            <Link
              to="/app/profile"
              className="inline-flex h-10 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Hủy
            </Link>
            <SubmitButton
              loading={isSubmitting}
              disabled={!isValid}
              className="h-10 w-auto px-5 text-sm"
            >
              <ShieldCheck />
              Đổi mật khẩu
            </SubmitButton>
          </>
        }
      >
        <div className="space-y-5">
          <FormField
            id="currentPassword"
            label="Mật khẩu hiện tại"
            required
            error={errors.currentPassword?.message}
            hint={
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primary hover:text-brand hover:underline"
              >
                Quên mật khẩu?
              </Link>
            }
          >
            <PasswordInput
              id="currentPassword"
              required
              autoComplete="current-password"
              placeholder="Nhập mật khẩu đang dùng"
              aria-invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
          </FormField>

          <FormField
            id="newPassword"
            label="Mật khẩu mới"
            required
            error={errors.newPassword?.message}
          >
            <PasswordInput
              id="newPassword"
              required
              autoComplete="new-password"
              placeholder="Tạo mật khẩu mới"
              aria-invalid={!!errors.newPassword}
              {...register('newPassword', {
                // Sửa mật khẩu mới sau khi đã nhập ô xác nhận thì kiểm tra lại ô xác nhận
                onChange: () => {
                  if (touchedFields.confirmPassword) void trigger('confirmPassword');
                },
              })}
            />
            <PasswordStrength value={newPassword} />
          </FormField>

          <FormField
            id="confirmPassword"
            label="Xác nhận mật khẩu mới"
            required
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              required
              icon={passwordsMatch ? <CircleCheck className="text-success" /> : <LockKeyhole />}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu mới"
              aria-invalid={!!errors.confirmPassword}
              className={cn(
                passwordsMatch &&
                  'border-success focus-visible:border-success focus-visible:ring-success/20',
              )}
              {...register('confirmPassword')}
            />
            <PasswordMatchHint password={newPassword} confirm={confirmPassword} />
          </FormField>

          <p className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            Sau khi đổi mật khẩu, bạn sẽ được đăng xuất khỏi tất cả thiết bị khác. Trên thiết bị
            này, hệ thống tự đăng nhập lại bằng mật khẩu mới.
          </p>

          {formError?.message && (
            <FormAlert message={formError.message} onClose={() => clearErrors('root.server')} />
          )}
        </div>
      </SectionCard>
    </form>
  );
}

function ChangePasswordDone() {
  return (
    <section className="flex flex-col items-center rounded-3xl border border-border bg-white px-6 py-12 text-center shadow-2xs">
      <span className="flex size-14 items-center justify-center rounded-full bg-success text-white shadow-md ring-8 ring-success-soft/50">
        <Check className="size-6" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
        Đổi mật khẩu thành công!
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Các thiết bị khác đã được đăng xuất. Bạn vẫn tiếp tục học trên thiết bị này với mật khẩu
        mới.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <ButtonLink to="/app/profile">
          <ArrowLeft />
          Về hồ sơ cá nhân
        </ButtonLink>
        <ButtonLink to="/app" variant="ghost">
          Về trang chủ
        </ButtonLink>
      </div>
    </section>
  );
}

const CREATE_PASSWORD_STEPS = [
  'Bấm "Gửi liên kết tạo mật khẩu" bên dưới',
  'Mở email từ Smart English Exam, bấm liên kết (hiệu lực 15 phút)',
  'Đặt mật khẩu mới, sau đó đăng nhập lại',
];

// Không có mật khẩu hiện tại để nhập, nên dùng lại luồng Quên mật khẩu: gửi liên kết tới email,
// đặt mật khẩu ở trang /reset-password (backend đăng xuất mọi thiết bị sau khi đặt xong)
function CreatePasswordCard({ email }: { email: string }) {
  const [forgotPassword, { isLoading, isSuccess, error, reset }] = useForgotPasswordMutation();
  const mailbox = getMailbox(email, MAIL_SUBJECTS.resetPassword);

  return (
    <SectionCard
      icon={KeyRound}
      title="Tạo mật khẩu đăng nhập"
      description="Tài khoản được tạo bằng Google nên chưa có mật khẩu"
      footer={
        <>
          <Link
            to="/app/profile"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Quay lại
          </Link>
          <SubmitButton
            type="button"
            loading={isLoading}
            className="h-10 w-auto px-5 text-sm"
            onClick={() => void forgotPassword({ email })}
          >
            <Send />
            {isSuccess ? 'Gửi lại liên kết' : 'Gửi liên kết tạo mật khẩu'}
          </SubmitButton>
        </>
      }
    >
      <div className="space-y-5">
        <p className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground">
          <GoogleIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            Bạn vẫn đăng nhập bằng Google như bình thường. Tạo thêm mật khẩu nếu muốn đăng nhập bằng
            email <span className="font-semibold break-all">{email}</span> và mật khẩu.
          </span>
        </p>

        <ol className="space-y-3 text-sm text-foreground">
          {CREATE_PASSWORD_STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <p className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          Đặt mật khẩu xong, bạn sẽ được đăng xuất khỏi tất cả thiết bị và cần đăng nhập lại.
        </p>

        {isSuccess && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success-soft/40 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-start gap-2.5 text-foreground">
              <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                Đã gửi liên kết tới <span className="font-semibold break-all">{email}</span>. Không
                thấy thư? Hãy xem thêm mục <b>Spam</b>.
              </span>
            </p>
            {mailbox && (
              <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg">
                <a href={mailbox.url} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Mở {mailbox.name}
                </a>
              </Button>
            )}
          </div>
        )}

        {error && <FormAlert message={toApiError(error).message} onClose={reset} />}
      </div>
    </SectionCard>
  );
}

function PasswordTips() {
  return (
    <aside className="rounded-3xl border border-[#c5d0fa] bg-accent p-6">
      <h2 className="flex items-center gap-3 font-bold text-foreground">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-2xs">
          <Lightbulb className="size-5" />
        </span>
        Mẹo tạo mật khẩu an toàn
      </h2>
      <ul className="mt-5 space-y-3">
        {TIPS.map((tip) => (
          <li key={tip} className="flex items-start gap-2.5 text-sm text-foreground">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-skill-listening" />
            {tip}
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-center gap-1.5 border-t border-primary/15 pt-4 text-xs text-subtle">
        <Clock className="size-3.5" />
        Đổi xong, các thiết bị khác cần đăng nhập lại
      </p>
    </aside>
  );
}
