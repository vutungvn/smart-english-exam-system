import type { ErrorCode, ErrorEnvelopeDto, FieldErrorDto } from './generated';

// Lỗi phát sinh ở FE, không có trong ErrorCode của backend
export type ClientErrorCode = 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

export interface ApiError {
  status: number | null; // null: không nhận được phản hồi hợp lệ từ server
  code: ErrorCode | ClientErrorCode;
  message: string;
  fieldErrors: FieldErrorDto[]; // chỉ có khi code = VALIDATION_ERROR
}

function isErrorEnvelope(data: unknown): data is ErrorEnvelopeDto {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    data.success === false &&
    'error' in data
  );
}

/** Chuyển lỗi ném ra từ `unwrap()` hoặc `error` của hook RTK Query về dạng thống nhất */
export function toApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const data = 'data' in error ? error.data : undefined;
    if (isErrorEnvelope(data)) {
      const { code, message, details } = data.error;
      return {
        status: data.status,
        code,
        message,
        fieldErrors: code === 'VALIDATION_ERROR' && Array.isArray(details) ? details : [],
      };
    }
    // FETCH_ERROR (mất mạng), PARSING_ERROR, hoặc 5xx không theo vỏ lỗi (backend tắt, proxy Vite báo lỗi)
    if (typeof error.status !== 'number' || error.status >= 500) {
      return {
        status: null,
        code: 'NETWORK_ERROR',
        message: 'Không kết nối được máy chủ, vui lòng kiểm tra mạng và thử lại',
        fieldErrors: [],
      };
    }
  }
  return {
    status: null,
    code: 'UNKNOWN_ERROR',
    message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    fieldErrors: [],
  };
}
