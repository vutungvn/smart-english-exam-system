import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';

/**
 * Lỗi nghiệp vụ gắn với một trường của body, trả cùng dạng với lỗi validate DTO:
 * { code: VALIDATION_ERROR, details: [{ field, message }] } → FE gán thẳng vào ô nhập (applyFieldErrors).
 */
export function fieldError(field: string, message: string): AppException {
  return new AppException(ErrorCode.VALIDATION_ERROR, undefined, [{ field, message }]);
}
