import { ParseUUIDPipe } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import type { ErrorCode } from '../errors/error-codes.js';

/**
 * Kiểm tra :id trên URL là UUID. Sai định dạng thì chắc chắn không có bản ghi nào,
 * nên trả luôn mã "không tìm thấy" của tài nguyên đó thay vì lỗi 400 chung chung.
 *   @Param('id', UuidParam(ErrorCode.QUESTION_NOT_FOUND)) id: string
 */
export function UuidParam(notFoundCode: ErrorCode): ParseUUIDPipe {
  return new ParseUUIDPipe({ exceptionFactory: () => new AppException(notFoundCode) });
}
