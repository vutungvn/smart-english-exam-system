import { useState, type FormEvent } from 'react';
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
import { ButtonLink } from '@/components/ButtonLink';
import { FormField } from '@/components/form/FormField';
import { IconInput } from '@/components/form/IconInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { ResultCard } from '../components/ResultCard';
import { RESEND_COOLDOWN_SECONDS, useCooldown } from '../hooks/use-cooldown';
import { getMailbox, MAIL_SUBJECTS } from '../mailbox';

export function ForgotPasswordPage() {
  const cooldown = useCooldown();
  const [sentTo, setSentTo] = useState<string | null>(null);

  // TẠM (giai đoạn giao diện): chưa gọi POST /auth/forgot-password
  const send = (email: string) => {
    setSentTo(email);
    cooldown.start(RESEND_COOLDOWN_SECONDS);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(String(new FormData(event.currentTarget).get('email')));
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
          disabled={cooldown.remaining > 0}
          onClick={() => send(sentTo)}
        >
          <RotateCw />
          {cooldown.remaining > 0 ? `Gửi lại sau ${cooldown.remaining}s` : 'Gửi lại liên kết'}
        </Button>

        <div className="flex items-center justify-between border-t pt-3 text-[11px] font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => setSentTo(null)}
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField id="email" label="Email đăng ký tài khoản" required>
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

          <SubmitButton>
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
