// Backend gửi mail thật (Gmail SMTP) tới hộp thư của người dùng. Đoán dịch vụ webmail theo
// tên miền email để hiện nút mở nhanh; tên miền lạ (mail trường, công ty) thì không có nút.

// Tiêu đề thư, khớp backend/src/modules/auth/templates/*.template.ts
export const MAIL_SUBJECTS = {
  verifyEmail: 'Xác minh email tài khoản Smart English Exam',
  resetPassword: 'Đặt lại mật khẩu Smart English Exam',
} as const;

const PROVIDERS = [
  {
    name: 'Gmail',
    domains: ['gmail.com', 'googlemail.com'],
    // authuser chọn đúng tài khoản khi đăng nhập nhiều tài khoản Google; tìm sẵn thư theo
    // tiêu đề ở mọi thư mục (kể cả Spam)
    url: (email: string, subject: string) =>
      `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}#search/${encodeURIComponent(`in:anywhere subject:"${subject}"`)}`,
  },
  {
    name: 'Outlook',
    domains: ['outlook.com', 'outlook.com.vn', 'hotmail.com', 'live.com', 'msn.com'],
    url: () => 'https://outlook.live.com/mail/',
  },
  {
    name: 'Yahoo Mail',
    domains: ['yahoo.com', 'yahoo.com.vn', 'ymail.com'],
    url: () => 'https://mail.yahoo.com/',
  },
  {
    name: 'iCloud Mail',
    domains: ['icloud.com', 'me.com', 'mac.com'],
    url: () => 'https://www.icloud.com/mail',
  },
];

export interface Mailbox {
  name: string;
  url: string;
}

export function getMailbox(email: string, subject: string): Mailbox | null {
  const domain = email.split('@').pop()?.trim().toLowerCase() ?? '';
  const provider = PROVIDERS.find((p) => p.domains.includes(domain));
  return provider ? { name: provider.name, url: provider.url(email, subject) } : null;
}
