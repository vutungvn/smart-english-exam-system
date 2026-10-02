import { escapeHtml } from '../../../common/utils/escape-html.js';
import type { MailContent } from '../../../infra/mail/mail.types.js';

interface ResetPasswordParams {
  fullName: string;
  link: string;
  expiresInMinutes: number;
}

export function resetPasswordTemplate({
  fullName,
  link,
  expiresInMinutes,
}: ResetPasswordParams): MailContent {
  const name = escapeHtml(fullName);
  const href = escapeHtml(link);

  return {
    subject: 'Đặt lại mật khẩu Smart Exam',
    text: [
      `Chào ${fullName},`,
      '',
      'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Smart Exam của bạn.',
      'Mở liên kết dưới đây để đặt mật khẩu mới:',
      link,
      '',
      `Liên kết có hiệu lực trong ${expiresInMinutes} phút và chỉ dùng được một lần.`,
      'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937">
        <p>Chào <strong>${name}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Smart Exam của bạn.</p>
        <p>
          <a href="${href}"
             style="display: inline-block; padding: 10px 20px; background: #2563eb;
                    color: #ffffff; text-decoration: none; border-radius: 6px">
            Đặt mật khẩu mới
          </a>
        </p>
        <p>Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:<br />
          <a href="${href}">${href}</a>
        </p>
        <p>Liên kết có hiệu lực trong <strong>${expiresInMinutes} phút</strong> và chỉ dùng được một lần.</p>
        <p style="color: #6b7280">
          Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.
        </p>
      </div>
    `,
  };
}
