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
  AUTH_CURRENT_PASSWORD_INCORRECT: 'AUTH_CURRENT_PASSWORD_INCORRECT',
  AUTH_PASSWORD_NOT_SET: 'AUTH_PASSWORD_NOT_SET',
  AUTH_GOOGLE_DISABLED: 'AUTH_GOOGLE_DISABLED',
  AUTH_GOOGLE_FAILED: 'AUTH_GOOGLE_FAILED',
  AUTH_GOOGLE_EMAIL_UNVERIFIED: 'AUTH_GOOGLE_EMAIL_UNVERIFIED',
  AUTH_GOOGLE_STUDENT_ONLY: 'AUTH_GOOGLE_STUDENT_ONLY',

  // Tệp
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  AVATAR_INVALID_IMAGE: 'AVATAR_INVALID_IMAGE',
  MEDIA_LINK_INVALID: 'MEDIA_LINK_INVALID',
  MEDIA_RANGE_NOT_SATISFIABLE: 'MEDIA_RANGE_NOT_SATISFIABLE',

  // Ngân hàng câu hỏi
  SUBJECT_NOT_FOUND: 'SUBJECT_NOT_FOUND',
  QUESTION_NOT_FOUND: 'QUESTION_NOT_FOUND',
  QUESTION_GROUP_NOT_FOUND: 'QUESTION_GROUP_NOT_FOUND',
  QUESTION_GROUP_NOT_EMPTY: 'QUESTION_GROUP_NOT_EMPTY',
  QUESTION_GROUP_ORDER_TAKEN: 'QUESTION_GROUP_ORDER_TAKEN',
  QUESTION_CODE_TAKEN: 'QUESTION_CODE_TAKEN',
  QUESTION_IN_PUBLISHED_EXAM: 'QUESTION_IN_PUBLISHED_EXAM',

  // Nhập câu hỏi từ tệp .zip
  QUESTION_IMPORT_INVALID_FILE: 'QUESTION_IMPORT_INVALID_FILE',
  QUESTION_IMPORT_NOT_FOUND: 'QUESTION_IMPORT_NOT_FOUND',
  QUESTION_IMPORT_HAS_ERRORS: 'QUESTION_IMPORT_HAS_ERRORS',
  QUESTION_IMPORT_IN_PROGRESS: 'QUESTION_IMPORT_IN_PROGRESS',

  // Đề thi
  EXAM_NOT_FOUND: 'EXAM_NOT_FOUND',
  EXAM_SECTION_NOT_FOUND: 'EXAM_SECTION_NOT_FOUND',
  EXAM_QUESTION_NOT_FOUND: 'EXAM_QUESTION_NOT_FOUND',
  EXAM_PUBLISHED: 'EXAM_PUBLISHED',
  EXAM_SECTION_EXISTS: 'EXAM_SECTION_EXISTS',
  EXAM_QUESTION_DUPLICATE: 'EXAM_QUESTION_DUPLICATE',
  EXAM_NOT_PUBLISHABLE: 'EXAM_NOT_PUBLISHABLE',
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
  [ErrorCode.AUTH_CURRENT_PASSWORD_INCORRECT]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Mật khẩu hiện tại không đúng',
  },
  [ErrorCode.AUTH_PASSWORD_NOT_SET]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Tài khoản chưa có mật khẩu, hãy dùng Quên mật khẩu để tạo mật khẩu',
  },
  [ErrorCode.AUTH_GOOGLE_DISABLED]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Đăng nhập bằng Google chưa được bật',
  },
  [ErrorCode.AUTH_GOOGLE_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Đăng nhập bằng Google không thành công, vui lòng thử lại',
  },
  [ErrorCode.AUTH_GOOGLE_EMAIL_UNVERIFIED]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Email của tài khoản Google chưa được xác minh',
  },
  [ErrorCode.AUTH_GOOGLE_STUDENT_ONLY]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Đăng nhập bằng Google chỉ dành cho học viên, vui lòng dùng email và mật khẩu',
  },
  // Tệp
  [ErrorCode.STORAGE_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Kho lưu trữ tệp tạm thời không khả dụng, vui lòng thử lại sau',
  },
  [ErrorCode.AVATAR_INVALID_IMAGE]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Ảnh không hợp lệ, chỉ nhận ảnh JPEG, PNG hoặc WebP',
  },
  [ErrorCode.MEDIA_LINK_INVALID]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Liên kết tệp không hợp lệ hoặc đã hết hạn, vui lòng tải lại trang',
  },
  [ErrorCode.MEDIA_RANGE_NOT_SATISFIABLE]: {
    status: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    message: 'Khoảng byte yêu cầu nằm ngoài kích thước tệp',
  },
  // Ngân hàng câu hỏi
  [ErrorCode.SUBJECT_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy chương trình thi',
  },
  [ErrorCode.QUESTION_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy câu hỏi',
  },
  [ErrorCode.QUESTION_GROUP_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy nhóm câu hỏi',
  },
  [ErrorCode.QUESTION_GROUP_NOT_EMPTY]: {
    status: HttpStatus.CONFLICT,
    message: 'Nhóm còn câu hỏi, hãy xóa các câu trong nhóm trước',
  },
  [ErrorCode.QUESTION_GROUP_ORDER_TAKEN]: {
    status: HttpStatus.CONFLICT,
    message: 'Vị trí này trong nhóm đã có câu hỏi khác',
  },
  [ErrorCode.QUESTION_CODE_TAKEN]: {
    status: HttpStatus.CONFLICT,
    message: 'Mã câu hỏi đã có trong ngân hàng, vui lòng xem trước lại tệp',
  },
  [ErrorCode.QUESTION_IN_PUBLISHED_EXAM]: {
    status: HttpStatus.CONFLICT,
    message: 'Câu hỏi đang nằm trong đề đã xuất bản, hãy gỡ xuất bản đề trước khi xóa',
  },
  // Nhập câu hỏi từ tệp .zip
  [ErrorCode.QUESTION_IMPORT_INVALID_FILE]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Tệp nhập không hợp lệ, cần tệp .zip gồm questions.xlsx và thư mục media/',
  },
  [ErrorCode.QUESTION_IMPORT_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Phiên nhập tệp không tồn tại hoặc đã hết hạn, vui lòng tải tệp lên lại',
  },
  [ErrorCode.QUESTION_IMPORT_HAS_ERRORS]: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'Tệp còn dòng lỗi, hãy sửa rồi tải lên lại',
  },
  [ErrorCode.QUESTION_IMPORT_IN_PROGRESS]: {
    status: HttpStatus.CONFLICT,
    message: 'Tệp này đang được nhập, vui lòng chờ trong giây lát',
  },
  // Đề thi
  [ErrorCode.EXAM_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy đề thi',
  },
  [ErrorCode.EXAM_SECTION_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy phần thi trong đề',
  },
  [ErrorCode.EXAM_QUESTION_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Không tìm thấy câu hỏi trong phần thi',
  },
  [ErrorCode.EXAM_PUBLISHED]: {
    status: HttpStatus.CONFLICT,
    message: 'Đề đang xuất bản, hãy gỡ xuất bản trước khi sửa nội dung hoặc xóa đề',
  },
  [ErrorCode.EXAM_SECTION_EXISTS]: {
    status: HttpStatus.CONFLICT,
    message: 'Đề đã có phần thi cho Part này',
  },
  [ErrorCode.EXAM_QUESTION_DUPLICATE]: {
    status: HttpStatus.CONFLICT,
    message: 'Câu hỏi đã có trong đề',
  },
  [ErrorCode.EXAM_NOT_PUBLISHABLE]: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'Đề chưa đủ điều kiện xuất bản',
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
  [HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE]: ErrorCode.MEDIA_RANGE_NOT_SATISFIABLE,
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
