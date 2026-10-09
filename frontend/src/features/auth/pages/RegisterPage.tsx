import { Link, useNavigate } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CircleCheck, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useRegisterMutation } from '@/api/generated';
import { FormAlert } from '@/components/form/FormAlert';
import { FieldError } from '@/components/form/FieldError';
import { FormField } from '@/components/form/FormField';
import { IconInput } from '@/components/form/IconInput';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { applyFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { GoogleButton } from '../components/GoogleButton';
import { PasswordStrength } from '../components/PasswordStrength';
import { registerSchema, type RegisterValues } from '../schemas';

export function RegisterPage() {
  const navigate = useNavigate();
  const [registerAccount] = useRegisterMutation();
  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    formState: { errors, touchedFields, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    mode: 'onTouched',
  });
  // useWatch chỉ render lại component này khi 2 ô mật khẩu đổi (thanh độ mạnh, icon khớp)
  const [password, confirmPassword] = useWatch({
    control,
    name: ['password', 'confirmPassword'],
  });
  const passwordsMatch = confirmPassword !== '' && password === confirmPassword;

  const formError = errors.root?.server;

  // Đăng ký thành công thì backend đã gửi thư xác minh tới Gmail → sang màn Kiểm tra hộp thư
  const onSubmit = async (values: RegisterValues) => {
    try {
      const { data } = await registerAccount(values).unwrap();
      void navigate('/register/check-email', { state: { email: data.email, justSent: true } });
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'AUTH_EMAIL_ALREADY_EXISTS') {
        setError('email', { type: 'server', message: apiError.message }, { shouldFocus: true });
        return;
      }
      const fields = ['fullName', 'email', 'password', 'confirmPassword', 'acceptTerms'] as const;
      if (applyFieldErrors(apiError, setError, fields)) return;
      setError('root.server', { type: apiError.code, message: apiError.message });
    }
  };

  return (
    <>
      <AuthHeader
        compact
        badge="Học tập ứng dụng AI"
        title="Tạo tài khoản mới"
        description="Bắt đầu lộ trình luyện thi TOEIC cùng trợ lý AI."
      />

      <AuthCard className="not-tall:py-4 tiny:px-5">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-3 tall:gap-4"
        >
          <FormField id="fullName" label="Họ và tên" required error={errors.fullName?.message}>
            <IconInput
              id="fullName"
              required
              icon={<UserRound />}
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              className="not-tall:h-10"
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
            />
          </FormField>

          <FormField
            id="email"
            label="Email"
            required
            error={errors.email?.message}
            hint={
              <span className="text-[11px] font-medium text-success">Nhận liên kết xác minh</span>
            }
          >
            <IconInput
              id="email"
              type="email"
              required
              icon={<Mail />}
              autoComplete="email"
              inputMode="email"
              placeholder="nguyenvana@example.com"
              className="not-tall:h-10"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </FormField>

          <FormField id="password" label="Mật khẩu" required error={errors.password?.message}>
            <PasswordInput
              id="password"
              required
              autoComplete="new-password"
              placeholder="Tạo mật khẩu"
              className="not-tall:h-10"
              aria-invalid={!!errors.password}
              {...register('password', {
                // Sửa mật khẩu sau khi đã nhập ô xác nhận thì kiểm tra lại ô xác nhận
                onChange: () => {
                  if (touchedFields.confirmPassword) void trigger('confirmPassword');
                },
              })}
            />
            <PasswordStrength value={password} compact />
          </FormField>

          <FormField
            id="confirmPassword"
            label="Xác nhận mật khẩu"
            required
            error={errors.confirmPassword?.message}
          >
            {/* Khớp thì đổi icon và viền sang xanh ngay trong ô, không đẩy bố cục */}
            <PasswordInput
              id="confirmPassword"
              required
              icon={passwordsMatch ? <CircleCheck className="text-success" /> : <LockKeyhole />}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              aria-describedby="confirmPassword-status"
              aria-invalid={!!errors.confirmPassword}
              className={cn(
                'not-tall:h-10',
                passwordsMatch &&
                  'border-success focus-visible:border-success focus-visible:ring-success/20',
              )}
              {...register('confirmPassword')}
            />
            <span id="confirmPassword-status" aria-live="polite" className="sr-only">
              {passwordsMatch ? 'Mật khẩu trùng khớp' : ''}
            </span>
          </FormField>

          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                required
                aria-invalid={!!errors.acceptTerms}
                className="mt-0.5 size-4 shrink-0 accent-primary"
                {...register('acceptTerms')}
              />
              <span>
                Tôi đồng ý với{' '}
                <span className="font-semibold text-primary">Điều khoản sử dụng</span> và{' '}
                <span className="font-semibold text-primary">Chính sách xử lý dữ liệu cá nhân</span>
                .
              </span>
            </label>
            <FieldError message={errors.acceptTerms?.message} />
          </div>

          {formError?.message && (
            <FormAlert message={formError.message} onClose={() => clearErrors('root.server')} />
          )}

          <SubmitButton loading={isSubmitting} className="mt-1">
            Đăng ký tài khoản
            <ArrowRight className="transition-transform group-hover/button:translate-x-1" />
          </SubmitButton>
        </form>

        <div className="flex items-center gap-3 py-3 tall:py-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-bold tracking-wider text-subtle/80 uppercase">
            Hoặc đăng ký nhanh
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton label="Đăng ký với Google" />
      </AuthCard>

      <p className="mt-3 text-center text-sm text-slate-600 tall:mt-6">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="font-bold text-primary transition hover:text-brand hover:underline"
        >
          Đăng nhập ngay
        </Link>
      </p>
    </>
  );
}
