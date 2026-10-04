import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, CircleX, LockKeyhole } from 'lucide-react';
import { ButtonLink } from '@/components/ButtonLink';
import { FormField } from '@/components/form/FormField';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { ResultCard } from '../components/ResultCard';
import { PasswordMatchHint, PasswordStrength } from '../components/PasswordStrength';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [done, setDone] = useState(false);

  if (done) {
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

  // TẠM (giai đoạn giao diện): chỉ xét có token hay không.
  // Giai đoạn 3 gọi GET /auth/reset-password/validate để biết link còn hạn
  if (!token) {
    return (
      <ResultCard
        tone="error"
        icon={<CircleX />}
        title="Liên kết không còn hiệu lực"
        description="Liên kết đặt lại mật khẩu không hợp lệ, đã được dùng hoặc đã quá 15 phút. Hãy gửi yêu cầu mới."
      >
        <ButtonLink to="/forgot-password">Gửi lại liên kết mới</ButtonLink>
        <ButtonLink to="/login" variant="ghost">
          Quay lại đăng nhập
        </ButtonLink>
      </ResultCard>
    );
  }

  return <ResetPasswordForm onDone={() => setDone(true)} />;
}

function ResetPasswordForm({ onDone }: { onDone: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // TẠM (giai đoạn giao diện): chưa gọi POST /auth/reset-password
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onDone();
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField id="newPassword" label="Mật khẩu mới" required>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              required
              autoComplete="new-password"
              placeholder="Tạo mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordStrength value={newPassword} />
          </FormField>

          <FormField id="confirmPassword" label="Xác nhận mật khẩu mới" required>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              icon={<LockKeyhole />}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <PasswordMatchHint password={newPassword} confirm={confirmPassword} />
          </FormField>

          <SubmitButton>
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
