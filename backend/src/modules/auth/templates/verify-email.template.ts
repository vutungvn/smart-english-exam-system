import { escapeHtml } from '../../../common/utils/escape-html.js';
import type { MailContent } from '../../../infra/mail/mail.types.js';

interface VerifyEmailParams {
  fullName: string;
  link: string;
  expiresInHours: number;
}

export function verifyEmailTemplate({
  fullName,
  link,
  expiresInHours,
}: VerifyEmailParams): MailContent {
  const name = escapeHtml(fullName);
  const href = escapeHtml(link);

  return {
    subject: 'Xác minh email tài khoản Smart Exam',
    text: [
      `Chào ${fullName},`,
      '',
      'Cảm ơn bạn đã đăng ký Smart Exam. Mở liên kết dưới đây để kích hoạt tài khoản:',
      link,
      '',
      `Liên kết có hiệu lực trong ${expiresInHours} giờ và chỉ dùng được một lần.`,
      'Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937">
        <p>Chào <strong>${name}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký Smart Exam. Nhấn nút dưới đây để kích hoạt tài khoản:</p>
        <p>
          <a href="${href}"
             style="display: inline-block; padding: 10px 20px; background: #2563eb;
                    color: #ffffff; text-decoration: none; border-radius: 6px">
            Xác minh email
          </a>
        </p>
        <p>Nếu nút không hoạt động, sao chép liên kết sau vào trình duyệt:<br />
          <a href="${href}">${href}</a>
        </p>
        <p>Liên kết có hiệu lực trong ${expiresInHours} giờ và chỉ dùng được một lần.</p>
        <p style="color: #6b7280">Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.</p>
      </div>
    `,
  };
}
