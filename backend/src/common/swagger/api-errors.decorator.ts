import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ERROR_CATALOG } from '../errors/error-codes.js';
import type { ErrorCode } from '../errors/error-codes.js';
import { ErrorEnvelopeDto } from './envelope.schemas.js';

/** Mô tả của một status: liệt kê các mã lỗi có cùng status trong ERROR_CATALOG */
export function describeErrorStatus(status: HttpStatus): string {
  const codes = (Object.keys(ERROR_CATALOG) as ErrorCode[]).filter(
    (code) => ERROR_CATALOG[code].status === status,
  );
  return codes.length > 0 ? `Lỗi, error.code thuộc: ${codes.join(', ')}` : 'Lỗi';
}

/**
 * Khai báo lỗi riêng của nghiệp vụ (403, 404, 409, 429...) cho một route.
 * Lỗi chung 400/401/500 được addCommonErrorResponses tự thêm, không cần khai báo ở đây.
 */
export function ApiErrors(...statuses: HttpStatus[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(ErrorEnvelopeDto),
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: describeErrorStatus(status),
        schema: { $ref: getSchemaPath(ErrorEnvelopeDto) },
      }),
    ),
  );
}
