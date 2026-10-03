import { HttpStatus } from '@nestjs/common';

/**
 * Mã lỗi trả về trong `error.code`. Mã riêng của từng module (AUTH_INVALID_CREDENTIALS,
 * EXAM_NOT_PUBLISHED...) thêm vào đây khi làm module đó, nhớ khai báo cả trong ERROR_CATALOG.
 */
export const ErrorCode = {
  // Chung
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  GONE: 'GONE',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_ACCOUNT_PENDING_APPROVAL: 'AUTH_ACCOUNT_PENDING_APPROVAL',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',
  AUTH_EMAIL_ALREADY_EXISTS: 'AUTH_EMAIL_ALREADY_EXISTS',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOO_MANY_LOGIN_ATTEMPTS: 'AUTH_TOO_MANY_LOGIN_ATTEMPTS',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ErrorDefinition {
  status: HttpStatus;
  message: string;
}

// Record<ErrorCode, ...> bắt buộc mã nào cũng có status + thông báo mặc định
export const ERROR_CATALOG: Record<ErrorCode, ErrorDefinition> = {
  [ErrorCode.BAD_REQUEST]: { status: HttpStatus.BAD_REQUEST, message: 'Yêu cầu không hợp lệ' },
  [ErrorCode.VALIDATION_ERROR]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu gửi lên không hợp lệ',
  },
  [ErrorCode.UNAUTHORIZED]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Bạn cần đăng nhập để tiếp tục',
  },
  [ErrorCode.FORBIDDEN]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Bạn không có quyền thực hiện thao tác này',
  },
  [ErrorCode.NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: 'Không tìm thấy tài nguyên' },
  [ErrorCode.CONFLICT]: { status: HttpStatus.CONFLICT, message: 'Dữ liệu bị trùng hoặc xung đột' },
  [ErrorCode.VERSION_CONFLICT]: {
    status: HttpStatus.CONFLICT,
    message: 'Dữ liệu đã được cập nhật bởi người khác, vui lòng tải lại',
  },
  [ErrorCode.GONE]: { status: HttpStatus.GONE, message: 'Tài nguyên không còn khả dụng' },
  [ErrorCode.PAYLOAD_TOO_LARGE]: {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    message: 'Dữ liệu gửi lên quá lớn',
  },
  [ErrorCode.UNPROCESSABLE_ENTITY]: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'Yêu cầu không thể xử lý',
  },
  [ErrorCode.TOO_MANY_REQUESTS]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau',
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Dịch vụ tạm thời không khả dụng',
  },

  // Auth
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Email hoặc mật khẩu không chính xác',
  },
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Tài khoản chưa xác minh email, vui lòng kiểm tra hộp thư',
  },
  [ErrorCode.AUTH_ACCOUNT_PENDING_APPROVAL]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Tài khoản đang chờ quản trị viên phê duyệt',
  },
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Tài khoản đã bị khóa, vui lòng liên hệ quản trị viên',
  },
  [ErrorCode.AUTH_REFRESH_TOKEN_INVALID]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  },
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: {
    status: HttpStatus.CONFLICT,
    message: 'Email đã được sử dụng',
  },
  [ErrorCode.AUTH_TOKEN_INVALID]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Liên kết không hợp lệ hoặc đã hết hạn',
  },
  [ErrorCode.AUTH_TOO_MANY_LOGIN_ATTEMPTS]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Bạn đã nhập sai mật khẩu quá nhiều lần, vui lòng thử lại sau 15 phút',
  },
};

// Dùng cho HttpException có sẵn của Nest (route không tồn tại, JSON sai cú pháp, throttler...)
const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.GONE]: ErrorCode.GONE,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.UNPROCESSABLE_ENTITY,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
};

export function errorCodeFromStatus(status: number): ErrorCode {
  return (
    STATUS_TO_CODE[status] ??
    (status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST)
  );
}
