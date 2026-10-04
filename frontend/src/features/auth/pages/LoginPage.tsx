import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowRight, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { IconInput } from '@/components/form/IconInput';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Button } from '@/components/ui/button';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';

// Màn Đăng nhập theo Stitch (project "Hệ thống luyện thi tiếng anh")
export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // TẠM (giai đoạn giao diện): giả lập gọi API để xem trạng thái loading và khung lỗi
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFormError('Email hoặc mật khẩu không chính xác');
    }, 800);
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="email" label="Email" required>
            <IconInput
              id="email"
              name="email"
              type="email"
              required
              icon={<Mail />}
              autoComplete="email"
              inputMode="email"
              placeholder="nguyenvana@example.com"
            />
          </FormField>

          <FormField id="password" label="Mật khẩu" required>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
            />
            <div className="flex justify-end pt-1">
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-brand hover:underline"
              >
                <KeyRound className="size-3" />
                Quên mật khẩu?
              </Link>
            </div>
          </FormField>

          {formError && (
            <FormAlert message={formError} onClose={() => setFormError(null)}>
              <Link to="/forgot-password" className="text-brand hover:underline">
                Khôi phục mật khẩu
              </Link>
            </FormAlert>
          )}

          <SubmitButton loading={loading} className="mt-2">
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
