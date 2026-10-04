import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, CircleCheck, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { FormField } from '@/components/form/FormField';
import { IconInput } from '@/components/form/IconInput';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { cn } from '@/lib/utils';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { PasswordStrength } from '../components/PasswordStrength';

export function RegisterPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordsMatch = confirmPassword !== '' && password === confirmPassword;

  // TẠM (giai đoạn giao diện): chưa gọi API, chuyển thẳng sang màn Kiểm tra hộp thư
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email'));
    void navigate('/register/check-email', { state: { email, justSent: true } });
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 tall:gap-4">
          <FormField id="fullName" label="Họ và tên" required>
            <IconInput
              id="fullName"
              name="fullName"
              required
              icon={<UserRound />}
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              className="not-tall:h-10"
            />
          </FormField>

          <FormField
            id="email"
            label="Email"
            required
            hint={
              <span className="text-[11px] font-medium text-success">Nhận liên kết xác minh</span>
            }
          >
            <IconInput
              id="email"
              name="email"
              type="email"
              required
              icon={<Mail />}
              autoComplete="email"
              inputMode="email"
              placeholder="nguyenvana@example.com"
              className="not-tall:h-10"
            />
          </FormField>

          <FormField id="password" label="Mật khẩu" required>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              placeholder="Tạo mật khẩu"
              className="not-tall:h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrength value={password} compact />
          </FormField>

          <FormField id="confirmPassword" label="Xác nhận mật khẩu" required>
            {/* Khớp thì đổi icon và viền sang xanh ngay trong ô, không đẩy bố cục */}
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              icon={passwordsMatch ? <CircleCheck className="text-success" /> : <LockKeyhole />}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              aria-describedby="confirmPassword-status"
              className={cn(
                'not-tall:h-10',
                passwordsMatch &&
                  'border-success focus-visible:border-success focus-visible:ring-success/20',
              )}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <span id="confirmPassword-status" aria-live="polite" className="sr-only">
              {passwordsMatch ? 'Mật khẩu trùng khớp' : ''}
            </span>
          </FormField>

          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              Tôi đồng ý với <span className="font-semibold text-primary">Điều khoản sử dụng</span>{' '}
              và{' '}
              <span className="font-semibold text-primary">Chính sách xử lý dữ liệu cá nhân</span>.
            </span>
          </label>

          <SubmitButton className="mt-1">
            Đăng ký tài khoản
            <ArrowRight className="transition-transform group-hover/button:translate-x-1" />
          </SubmitButton>
        </form>
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
