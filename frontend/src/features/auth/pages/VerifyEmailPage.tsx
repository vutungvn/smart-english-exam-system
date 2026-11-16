import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowRight, Check, CircleX, LoaderCircle } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useVerifyEmailMutation } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { ResultCard } from '../components/ResultCard';

type VerifyState =
  { status: 'verifying' } | { status: 'success' } | { status: 'error'; message: string };

// Token trong liên kết xác minh: 43 ký tự base64url (khớp VerifyEmailDto ở backend)
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

// Mở từ liên kết trong email xác minh: /verify-email?token=...
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  if (!token || !TOKEN_PATTERN.test(token)) return <VerifyFailed />;
  return <VerifyWithToken token={token} />;
}

function VerifyWithToken({ token }: { token: string }) {
  const [verifyEmail] = useVerifyEmailMutation();
  const [state, setState] = useState<VerifyState>({ status: 'verifying' });
  // Token chỉ dùng được một lần: StrictMode chạy effect 2 lần sẽ làm lần thứ hai báo lỗi
  // dù lần đầu đã thành công, nên chỉ gửi đúng một request cho mỗi lần mở trang
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    verifyEmail({ token })
      .unwrap()
      .then(() => setState({ status: 'success' }))
      .catch((error: unknown) => setState({ status: 'error', message: toApiError(error).message }));
  }, [token, verifyEmail]);

  if (state.status === 'verifying') {
    return (
      <ResultCard
        tone="info"
        icon={<LoaderCircle className="animate-spin" />}
        title="Đang xác minh email..."
        description="Vui lòng chờ trong giây lát."
      />
    );
  }

  if (state.status === 'error') return <VerifyFailed message={state.message} />;

  return (
    <ResultCard
      tone="success"
      icon={<Check />}
      title="Xác thực thành công!"
      description="Tài khoản của bạn đã được kích hoạt. Đăng nhập để bắt đầu luyện thi TOEIC."
    >
      <ButtonLink to="/login">
        Đến trang Đăng nhập <ArrowRight />
      </ButtonLink>
    </ResultCard>
  );
}

function VerifyFailed({ message }: { message?: string }) {
  return (
    <ResultCard
      tone="error"
      icon={<CircleX />}
      title="Không thể xác minh email"
      description={
        <>
          {message ?? 'Liên kết không hợp lệ hoặc đã hết hạn.'} Hãy đăng nhập bằng email đã đăng ký,
          hệ thống sẽ cho bạn gửi lại email xác minh.
        </>
      }
    >
      <ButtonLink to="/login">Đến trang Đăng nhập</ButtonLink>
    </ResultCard>
  );
}
