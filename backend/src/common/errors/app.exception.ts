import { HttpException } from '@nestjs/common';
import { ERROR_CATALOG, ErrorCode } from './error-codes.js';

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string = ERROR_CATALOG[code].message,
    readonly details?: unknown,
  ) {
    super(message, ERROR_CATALOG[code].status);
  }
}
