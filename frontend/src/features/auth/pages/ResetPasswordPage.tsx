import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, CircleX, LoaderCircle, LockKeyhole } from 'lucide-react';
import { baseApi } from '@/api/base-api';
import { toApiError } from '@/api/errors';
import { useResetPasswordMutation, useValidateResetTokenQuery } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { useAppDispatch } from '@/hooks/hooks';
import { applyFieldErrors } from '@/lib/form-errors';
import { sessionCleared } from '@/store/slice/auth-slice';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { PasswordMatchHint, PasswordStrength } from '../components/PasswordStrength';
import { ResultCard } from '../components/ResultCard';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';

// Token trong liên kết đặt lại mật khẩu: 43 ký tự base64url (khớp ResetPasswordTokenDto ở backend)
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

// Mở từ liên kết trong email: /reset-password?token=...
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [result, setResult] = useState<'form' | 'done' | 'expired'>('form');

  if (result === 'done') return <ResetDone />;
  if (!token || !TOKEN_PATTERN.test(token) || result === 'expired') return <LinkExpired />;

  return (
    <ResetWithToken
      token={token}
      onDone={() => setResult('done')}
      onExpired={() => setResult('expired')}
    />
  );
}

interface ResetWithTokenProps {
  token: string;
  onDone: () => void;
  onExpired: () => void;
}

// Kiểm tra liên kết còn hạn trước khi cho nhập mật khẩu (validate không hủy token)
function ResetWithToken({ token, onDone, onExpired }: ResetWithTokenProps) {
  const { isLoading, error } = useValidateResetTokenQuery(token);

  if (isLoading) {
    return (
      <ResultCard
        tone="info"
        icon={<LoaderCircle className="animate-spin" />}
        title="Đang kiểm tra liên kết..."
        description="Vui lòng chờ trong giây lát."
      />
    );
  }

  if (error) {
    const apiError = toApiError(error);
    // Liên kết sai/hết hạn dùng thông báo mặc định; lỗi khác (mất kết nối...) hiện đúng nguyên nhân
    return (
      <LinkExpired
        message={apiError.code === 'AUTH_TOKEN_INVALID' ? undefined : apiError.message}
      />
    );
  }

  return <ResetPasswordForm token={token} onDone={onDone} onExpired={onExpired} />;
}

function ResetPasswordForm({ token, onDone, onExpired }: ResetWithTokenProps) {
  const dispatch = useAppDispatch();
  const [resetPassword] = useResetPasswordMutation();
  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    formState: { errors, touchedFields, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });
  const [newPassword, confirmPassword] = useWatch({
    control,
    name: ['newPassword', 'confirmPassword'],
  });
  const formError = errors.root?.server;

  const onSubmit = async (values: ResetPasswordValues) => {
    try {
      await resetPassword({ token, ...values }).unwrap();
      onDone();
      // Backend đã đăng xuất mọi thiết bị: xóa luôn phiên trên trình duyệt này (nếu đang đăng nhập)
      dispatch(sessionCleared());
      dispatch(baseApi.util.resetApiState());
    } catch (error) {
      const apiError = toApiError(error);
      // Liên kết vừa hết hạn hoặc đã được dùng ở tab khác
      if (apiError.code === 'AUTH_TOKEN_INVALID') {
        onExpired();
        return;
      }
      if (applyFieldErrors(apiError, setError, ['newPassword', 'confirmPassword'])) return;
      setError('root.server', { type: apiError.code, message: apiError.message });
    }
  };

  return (
    <>
      <AuthHeader
        badge="Bảo mật tài khoản"
        title="Thiết lập mật khẩu mới"
        description={
          <>
            Nhập mật khẩu mới để tiếp tục lộ trình học tập. Liên kết từ email có hiệu lực trong{' '}
            <span className="font-medium text-brand">15 phút</span>.
          </>
        }
      />

      <AuthCard>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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
                // Sửa mật khẩu sau khi đã nhập ô xác nhận thì kiểm tra lại ô xác nhận
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
              icon={<LockKeyhole />}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu mới"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            <PasswordMatchHint password={newPassword} confirm={confirmPassword} />
          </FormField>

          {formError?.message && (
            <FormAlert message={formError.message} onClose={() => clearErrors('root.server')} />
          )}

          <SubmitButton loading={isSubmitting}>
            Xác nhận đổi mật khẩu <ArrowRight />
          </SubmitButton>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-brand"
          >
            <ArrowLeft className="size-3" />
            Quay lại màn hình Đăng nhập
          </Link>
        </form>
      </AuthCard>
    </>
  );
}

function ResetDone() {
  return (
    <ResultCard
      tone="success"
      icon={<Check />}
      title="Đổi mật khẩu thành công!"
      description="Vì lý do an toàn, mọi thiết bị đã được đăng xuất. Hãy đăng nhập lại bằng mật khẩu mới."
    >
      <ButtonLink to="/login">
        Đến trang Đăng nhập <ArrowRight />
      </ButtonLink>
    </ResultCard>
  );
}

function LinkExpired({ message }: { message?: string }) {
  return (
    <ResultCard
      tone="error"
      icon={<CircleX />}
      title="Liên kết không còn hiệu lực"
      description={
        message ??
        'Liên kết đặt lại mật khẩu không hợp lệ, đã được dùng hoặc đã quá 15 phút. Hãy gửi yêu cầu mới.'
      }
    >
      <ButtonLink to="/forgot-password">Gửi lại liên kết mới</ButtonLink>
      <ButtonLink to="/login" variant="ghost">
        Quay lại đăng nhập
      </ButtonLink>
    </ResultCard>
  );
}
