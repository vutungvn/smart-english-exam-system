// Cookie chỉ được trình duyệt gửi kèm các route /api/v1/auth/* (khớp setGlobalPrefix + version 1)
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export const redisKeys = {
  // Mỗi phiên đăng nhập (mỗi thiết bị) là một key, tự hết hạn cùng refresh token
  refreshSession: (userId: string, jti: string) => `refresh:${userId}:${jti}`,
  refreshSessionsOf: (userId: string) => `refresh:${userId}:*`,
};
