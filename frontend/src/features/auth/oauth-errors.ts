// Backend không trả JSON lỗi được trên route điều hướng, nên chuyển về /login?oauthError=<mã lỗi>
export const OAUTH_ERROR_PARAM = 'oauthError';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  AUTH_GOOGLE_STUDENT_ONLY:
    'Đăng nhập bằng Google chỉ dành cho học viên. Giáo viên và quản trị viên vui lòng đăng nhập bằng email và mật khẩu.',
  AUTH_GOOGLE_EMAIL_UNVERIFIED:
    'Email của tài khoản Google chưa được xác minh. Vui lòng xác minh email với Google hoặc đăng ký bằng email.',
  AUTH_ACCOUNT_LOCKED: 'Tài khoản đã bị khóa, vui lòng liên hệ quản trị viên.',
  AUTH_GOOGLE_DISABLED:
    'Đăng nhập bằng Google đang tạm tắt. Vui lòng đăng nhập bằng email và mật khẩu.',
};

const DEFAULT_MESSAGE = 'Đăng nhập bằng Google không thành công, vui lòng thử lại.';

/** Mã lạ (người dùng tự sửa URL) cũng chỉ hiện thông báo chung, không hiện nguyên chuỗi trên URL */
export function describeOAuthError(code: string): string {
  return OAUTH_ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE;
}
