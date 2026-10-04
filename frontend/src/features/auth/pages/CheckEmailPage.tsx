import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { ArrowLeft, ExternalLink, MailCheck, PencilLine, RotateCw } from 'lucide-react';
import { ButtonLink } from '@/components/ButtonLink';
import { Button } from '@/components/ui/button';
import { ResultCard } from '../components/ResultCard';
import { RESEND_COOLDOWN_SECONDS, useCooldown } from '../hooks/use-cooldown';
import { getMailbox, MAIL_SUBJECTS } from '../mailbox';

interface CheckEmailState {
  email?: string;
  justSent?: boolean;
}

export function CheckEmailPage() {
  const state = useLocation().state as CheckEmailState | null;
  // Vào thẳng URL (không qua Đăng ký/Đăng nhập) thì không biết email nào → về Đăng ký
  if (!state?.email) return <Navigate to="/register" replace />;
  return <CheckEmailView email={state.email} justSent={state.justSent ?? false} />;
}

function CheckEmailView({ email, justSent }: { email: string; justSent: boolean }) {
  // Vừa đăng ký xong thì email vừa được gửi → chờ hết đếm ngược mới cho gửi lại
  const cooldown = useCooldown(justSent ? RESEND_COOLDOWN_SECONDS : 0);
  const [notice, setNotice] = useState<string | null>(null);
  const mailbox = getMailbox(email, MAIL_SUBJECTS.verifyEmail);

  // TẠM (giai đoạn giao diện): chưa gọi POST /auth/resend-verification
  const handleResend = () => {
    cooldown.start(RESEND_COOLDOWN_SECONDS);
    setNotice('Đã gửi lại email xác minh, hãy kiểm tra hộp thư.');
  };

  return (
    <ResultCard
      tone="info"
      icon={<MailCheck />}
      title="Kiểm tra hộp thư của bạn"
      description={
        <>
          <p>Liên kết xác minh được gửi tới địa chỉ</p>
          <p className="my-2 rounded-lg bg-secondary px-2.5 py-1 font-semibold break-all text-brand">
            {email}
          </p>
          <p className="text-[13px] text-subtle">
            Mở thư <b>“{MAIL_SUBJECTS.verifyEmail}”</b> và nhấn <b>Xác minh email</b> để kích hoạt
            tài khoản. Liên kết có hiệu lực trong 24 giờ. Không thấy thư? Hãy xem thêm mục{' '}
            <b>Spam</b> hoặc <b>Quảng cáo</b>.
          </p>
        </>
      }
    >
      {mailbox && (
        <ButtonLink to={mailbox.url} target="_blank" rel="noreferrer">
          <ExternalLink />
          Mở {mailbox.name}
        </ButtonLink>
      )}

      <div className="flex flex-col gap-1 rounded-xl bg-secondary p-3">
        <p className="text-[11px] font-semibold text-muted-foreground">Chưa nhận được email?</p>
        <Button
          type="button"
          variant="ghost"
          className="text-brand"
          disabled={cooldown.remaining > 0}
          onClick={handleResend}
        >
          <RotateCw />
          {cooldown.remaining > 0 ? `Gửi lại sau ${cooldown.remaining}s` : 'Gửi lại email xác minh'}
        </Button>
      </div>

      {notice && (
        <p role="status" className="text-xs font-medium text-success">
          {notice}
        </p>
      )}

      <div className="flex items-center justify-between border-t pt-3 text-[11px] font-semibold text-muted-foreground">
        <Link to="/register" className="flex items-center gap-1 hover:text-brand">
          <PencilLine className="size-3" />
          Đổi email khác
        </Link>
        <Link to="/login" className="flex items-center gap-1 hover:text-brand">
          <ArrowLeft className="size-3" />
          Quay lại đăng nhập
        </Link>
      </div>
    </ResultCard>
  );
}
