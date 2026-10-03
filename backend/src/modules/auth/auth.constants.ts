// Cookie chỉ được trình duyệt gửi kèm các route /api/v1/auth/* (khớp setGlobalPrefix + version 1)
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

// Link xác minh email có hiệu lực 24 giờ, dùng một lần
export const VERIFY_EMAIL_TTL_SECONDS = 24 * 60 * 60;

// Link đặt lại mật khẩu có hiệu lực 15 phút, dùng một lần
export const RESET_PASSWORD_TTL_SECONDS = 15 * 60;

// Gửi lại email: tối đa 3 lần mỗi 15 phút cho một địa chỉ
export const EMAIL_REQUEST_LIMIT = 3;
export const EMAIL_REQUEST_WINDOW_SECONDS = 15 * 60;

// Sai mật khẩu 5 lần trong 15 phút → khóa đăng nhập 15 phút (tính từ lần sai cuối)
export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60;
export const LOGIN_LOCK_SECONDS = 15 * 60;

// Giới hạn số request theo IP cho /auth/* (ttl tính bằng mili giây, theo @nestjs/throttler v6).
// Đếm riêng từng route: gọi login nhiều không làm hết lượt của refresh.
export const AUTH_THROTTLE = {
  // Mức chung cho mọi route auth; refresh được FE gọi mỗi lần tải trang nên để rộng
  default: { limit: 30, ttl: 60_000 },
  // Chặn thử mật khẩu trên nhiều email từ một IP (khóa theo email chỉ chặn từng email)
  login: { limit: 10, ttl: 60_000 },
  // Route tạo tài khoản hoặc gửi mail: chặn spam tài khoản rác và mail rác
  sensitive: { limit: 5, ttl: 15 * 60_000 },
} satisfies Record<string, { limit: number; ttl: number }>;

// Mục đích của token một lần
export type OneTimeTokenPurpose = 'verify-email' | 'reset-password';
// Loại yêu cầu gửi email bị giới hạn (đếm riêng từng loại)
export type EmailRequestKind = 'resend-verification' | 'forgot-password';

export const redisKeys = {
  // Mỗi phiên đăng nhập (mỗi thiết bị) là một key, tự hết hạn cùng refresh token
  refreshSession: (userId: string, jti: string) => `refresh:${userId}:${jti}`,
  refreshSessionsOf: (userId: string) => `refresh:${userId}:*`,

  // Token một lần: key theo hash của token → userId
  oneTimeToken: (purpose: OneTimeTokenPurpose, tokenHash: string) =>
    `${purpose}:token:${tokenHash}`,
  // Con trỏ user → hash token hiện tại, để hủy token cũ khi gửi lại
  oneTimeTokenOf: (purpose: OneTimeTokenPurpose, userId: string) => `${purpose}:user:${userId}`,

  // Bộ đếm số lần gửi email theo từng địa chỉ
  emailRequests: (kind: EmailRequestKind, email: string) => `rate:${kind}:${email}`,

  // Bộ đếm số lần đăng nhập sai theo email; key còn và đạt ngưỡng nghĩa là đang bị khóa
  loginFailures: (email: string) => `rate:login-fail:${email}`,
};
