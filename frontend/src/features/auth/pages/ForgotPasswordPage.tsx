import { Link } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Mail,
  MailCheck,
  PencilLine,
  RotateCw,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useForgotPasswordMutation } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { IconInput } from '@/components/form/IconInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { applyFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { ResultCard } from '../components/ResultCard';
import { RESEND_COOLDOWN_SECONDS, useCooldown } from '../hooks/use-cooldown';
import { getMailbox, MAIL_SUBJECTS } from '../mailbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';
import { useState } from 'react';

export function ForgotPasswordPage() {
  const cooldown = useCooldown();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [forgotPassword, { isLoading: sending }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const formError = errors.root?.server;

  // Backend luôn trả thành công dù email có tồn tại hay không (không lộ tài khoản);
  // chỉ lỗi khi vượt 3 lần / 15 phút cho một email hoặc mất kết nối
  const send = async (email: string) => {
    await forgotPassword({ email }).unwrap();
    setSentTo(email);
    cooldown.start(RESEND_COOLDOWN_SECONDS);
  };

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    try {
      await send(email);
    } catch (error) {
      const apiError = toApiError(error);
      if (applyFieldErrors(apiError, setError, ['email'])) return;
      setError('root.server', { type: apiError.code, message: apiError.message });
    }
  };

  const handleResend = async (email: string) => {
    setResendError(null);
    try {
      await send(email);
    } catch (error) {
      setResendError(toApiError(error).message);
    }
  };

  if (sentTo) {
    const mailbox = getMailbox(sentTo, MAIL_SUBJECTS.resetPassword);
    return (
      <ResultCard
        tone="info"
        icon={<MailCheck />}
        title="Kiểm tra email của bạn"
        description={
          <>
            Nếu <b className="font-semibold break-all text-brand">{sentTo}</b> đã đăng ký tài khoản,
            chúng tôi đã gửi thư <b>“{MAIL_SUBJECTS.resetPassword}”</b>. Liên kết có hiệu lực trong{' '}
            <b className="font-semibold text-brand">15 phút</b>. Không thấy thư? Hãy xem thêm mục{' '}
            <b>Spam</b> hoặc <b>Quảng cáo</b>.
          </>
        }
      >
        {mailbox && (
          <ButtonLink to={mailbox.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            Mở {mailbox.name}
          </ButtonLink>
        )}

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-11 rounded-xl font-semibold"
          disabled={cooldown.remaining > 0 || sending}
          onClick={() => void handleResend(sentTo)}
        >
          <RotateCw className={cn(sending && 'animate-spin')} />
          {sending
            ? 'Đang gửi...'
            : cooldown.remaining > 0
              ? `Gửi lại sau ${cooldown.remaining}s`
              : 'Gửi lại liên kết'}
        </Button>

        {resendError && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {resendError}
          </p>
        )}

        <div className="flex items-center justify-between border-t pt-3 text-[11px] font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setResendError(null);
            }}
            className="flex items-center gap-1 hover:text-brand"
          >
            <PencilLine className="size-3" />
            Dùng email khác
          </button>
          <Link to="/login" className="flex items-center gap-1 hover:text-brand">
            <ArrowLeft className="size-3" />
            Quay lại đăng nhập
          </Link>
        </div>
      </ResultCard>
    );
  }

  return (
    <>
      <AuthHeader
        badge="Bảo mật tài khoản"
        title="Quên mật khẩu?"
        description="Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu."
      />

      <AuthCard accent className="pt-7">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField
            id="email"
            label="Email đăng ký tài khoản"
            required
            error={errors.email?.message}
          >
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

          {formError?.message && (
            <FormAlert message={formError.message} onClose={() => clearErrors('root.server')} />
          )}

          <SubmitButton loading={isSubmitting}>
            Gửi yêu cầu <ArrowRight />
          </SubmitButton>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 pt-2 text-sm font-semibold text-brand hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Quay lại Đăng nhập
          </Link>
        </form>
      </AuthCard>
    </>
  );
}
