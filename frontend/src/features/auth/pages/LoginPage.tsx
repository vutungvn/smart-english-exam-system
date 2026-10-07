import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useLoginMutation } from '@/api/generated';
import { toApiError } from '@/api/errors';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { IconInput } from '@/components/form/IconInput';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Button } from '@/components/ui/button';
import { applyFieldErrors } from '@/lib/form-errors';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { loginSchema, type LoginValues } from '../schemas';
import { useAppDispatch } from '@/hooks/hooks';
import { sessionReceived } from '@/store/slice/auth-slice';

// Màn Đăng nhập theo Stitch (project "Hệ thống luyện thi tiếng anh")
export function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login] = useLoginMutation();
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });
  // type của lỗi root = error.code từ server, dùng để chọn nút hành động trong khung lỗi
  const formError = errors.root?.server;

  const onSubmit = async (values: LoginValues) => {
    try {
      const { data: session } = await login(values).unwrap();
      dispatch(sessionReceived(session));
      // TẠM: mới có khu vực học viên; giáo viên/admin về trang xem trước cho tới khi có layout riêng.
      // Chưa xử lý mustChangePassword (chưa có trang Đổi mật khẩu)
      void navigate(session.user.role === 'STUDENT' ? '/app' : '/dev/auth', { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      if (applyFieldErrors(apiError, setError, ['email', 'password'])) return;
      setError('root.server', { type: apiError.code, message: apiError.message });
    }
  };

  return (
    <>
      <AuthHeader
        badge="Luyện thi TOEIC 4 kỹ năng"
        title="Đăng nhập tài khoản"
        description="Chào mừng bạn trở lại! Tiếp tục lộ trình luyện thi TOEIC cùng Smart English Exam."
      >
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-100/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-2xs">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>
            Dùng chung cho <strong className="font-semibold text-slate-900">Học viên</strong> &amp;{' '}
            <strong className="font-semibold text-slate-900">Giáo viên</strong>
          </span>
        </span>
      </AuthHeader>

      <AuthCard className="space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField id="email" label="Email" required error={errors.email?.message}>
            <IconInput
              id="email"
              type="email"
              required
              icon={<Mail />}
              autoComplete="email"
              inputMode="email"
              placeholder="nguyenvana@example.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </FormField>

          <FormField
            id="password"
            label="Mật khẩu"
            required
            error={errors.password?.message}
            hint={
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-brand hover:underline"
              >
                <KeyRound className="size-3" />
                Quên mật khẩu?
              </Link>
            }
          >
            <PasswordInput
              id="password"
              required
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </FormField>

          {formError?.message && (
            <FormAlert message={formError.message} onClose={() => clearErrors('root.server')}>
              {formError.type === 'AUTH_EMAIL_NOT_VERIFIED' ? (
                <Link
                  to="/register/check-email"
                  state={{ email: getValues('email').trim() }}
                  className="text-brand hover:underline"
                >
                  Gửi lại email xác minh
                </Link>
              ) : formError.type === 'AUTH_INVALID_CREDENTIALS' ? (
                <Link to="/forgot-password" className="text-brand hover:underline">
                  Khôi phục mật khẩu
                </Link>
              ) : null}
            </FormAlert>
          )}

          <SubmitButton loading={isSubmitting} className="mt-2">
            Đăng nhập ngay
            <ArrowRight className="transition-transform group-hover/button:translate-x-1" />
          </SubmitButton>
        </form>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-bold tracking-wider text-subtle/80 uppercase">
            Hoặc đăng nhập với
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* TẠM: backend chưa có đăng nhập Google (kế hoạch: Google OAuth, mức nên có) */}
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-3 rounded-xl border-slate-200/90 bg-white text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:shadow-xs"
        >
          <GoogleIcon className="size-4" />
          Tiếp tục với Google
        </Button>
      </AuthCard>

      <p className="mt-6 text-center text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="font-bold text-primary transition hover:text-brand hover:underline"
        >
          Đăng ký ngay
        </Link>
      </p>
    </>
  );
}
