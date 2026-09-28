import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ERROR_CATALOG, ErrorCode, errorCodeFromStatus } from '../errors/error-codes.js';
import { HttpAdapterHost } from '@nestjs/core';
import { AppException } from '../errors/app.exception.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ErrorEnvelope } from '../types/api-response.js';
import type { Request } from 'express';

interface ResolvedError {
  status: HttpStatus;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

// Lưới an toàn cho lỗi Prisma lọt ra khỏi Service
const PRISMA_ERROR_CODES: Partial<Record<string, ErrorCode>> = {
  P2002: ErrorCode.CONFLICT, // vi phạm unique
  P2003: ErrorCode.CONFLICT, // vi phạm khóa ngoại
  P2025: ErrorCode.NOT_FOUND, // bản ghi cần update/delete không tồn tại
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const error = this.resolve(exception);

    if (error.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.path} → ${error.code}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorEnvelope = {
      success: false,
      status: error.status,
      error: { code: error.code, message: error.message, details: error.details },
    };
    httpAdapter.reply(ctx.getResponse(), body, error.status);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    // HttpException có sẵn của Nest: route không tồn tại, JSON sai cú pháp, 429 của throttler...
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return this.fromCode(errorCodeFromStatus(status), status);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const code = PRISMA_ERROR_CODES[exception.code];

      if (code) return this.fromCode(code);
    }

    return this.fromCode(ErrorCode.INTERNAL_SERVER_ERROR);
  }

  private fromCode(
    code: ErrorCode,
    status: HttpStatus = ERROR_CATALOG[code].status,
  ): ResolvedError {
    return { status, code, message: ERROR_CATALOG[code].message };
  }
}
