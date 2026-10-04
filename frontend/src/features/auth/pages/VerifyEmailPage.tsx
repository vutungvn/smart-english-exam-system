import { useSearchParams } from 'react-router';
import { ArrowRight, Check, CircleX } from 'lucide-react';
import { ButtonLink } from '@/components/ButtonLink';
import { ResultCard } from '../components/ResultCard';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  // TẠM (giai đoạn giao diện): có token là coi như thành công.
  // Giai đoạn 3 gọi POST /auth/verify-email, thêm trạng thái "Đang xác minh..."
  if (!token) {
    return (
      <ResultCard
        tone="error"
        icon={<CircleX />}
        title="Không thể xác minh email"
        description="Liên kết không hợp lệ hoặc đã hết hạn. Hãy đăng nhập bằng email đã đăng ký, hệ thống sẽ cho bạn gửi lại email xác minh."
      >
        <ButtonLink to="/login">Đến trang Đăng nhập</ButtonLink>
      </ResultCard>
    );
  }

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
