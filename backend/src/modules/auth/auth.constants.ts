// Cookie chỉ được trình duyệt gửi kèm các route /api/v1/auth/* (khớp setGlobalPrefix + version 1)
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

// Link xác minh email có hiệu lực 24 giờ, dùng một lần
export const VERIFY_EMAIL_TTL_SECONDS = 24 * 60 * 60;

// Gửi lại email: tối đa 3 lần mỗi 15 phút cho một địa chỉ
export const EMAIL_REQUEST_LIMIT = 3;
export const EMAIL_REQUEST_WINDOW_SECONDS = 15 * 60;

// Mục đích của token một lần; sau này thêm 'reset-password'
export type OneTimeTokenPurpose = 'verify-email';
// Loại yêu cầu gửi email bị giới hạn; sau này thêm 'forgot-password'
export type EmailRequestKind = 'resend-verification';

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
};
