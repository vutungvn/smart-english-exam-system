import { applyDecorators } from '@nestjs/common';
import type { HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import type { ApiResponseExamples } from '@nestjs/swagger';
import { ERROR_CATALOG } from '../errors/error-codes.js';
import type { ErrorCode } from '../errors/error-codes.js';
import { ErrorEnvelopeDto } from './envelope.schemas.js';

/** Một lỗi route có thể trả; message/details bỏ trống thì lấy mặc định trong ERROR_CATALOG */
export interface ApiErrorExample {
  code: ErrorCode;
  message?: string;
  details?: unknown;
}

export type ApiErrorSpec = ErrorCode | ApiErrorExample;

function toExample(spec: ApiErrorSpec): ApiErrorExample {
  return typeof spec === 'string' ? { code: spec } : spec;
}

interface ErrorExampleValue {
  success: false;
  status: HttpStatus;
  error: { code: ErrorCode; message: string; details?: unknown };
}

/** Body lỗi đúng như AllExceptionsFilter trả về: { success: false, status, error } */
function errorExampleValue({ code, message, details }: ApiErrorExample): ErrorExampleValue {
  const { status, message: defaultMessage } = ERROR_CATALOG[code];
  return {
    success: false,
    status,
    error: {
      code,
      message: message ?? defaultMessage,
      ...(details === undefined ? {} : { details }),
    },
  };
}

/** Nhóm theo HTTP status; một mã có nhiều thông báo thì key thứ hai thành CODE_2, CODE_3... */
export function groupErrorExamples(
  specs: ApiErrorSpec[],
): Map<HttpStatus, Record<string, ApiResponseExamples>> {
  const groups = new Map<HttpStatus, Record<string, ApiResponseExamples>>();

  for (const example of specs.map(toExample)) {
    const status = ERROR_CATALOG[example.code].status;
    const examples = groups.get(status) ?? {};

    let key: string = example.code;
    for (let i = 2; key in examples; i++) key = `${example.code}_${i}`;

    const value = errorExampleValue(example);
    examples[key] = { summary: `${example.code}: ${value.error.message}`, value };
    groups.set(status, examples);
  }

  return groups;
}

/** Mô tả của một status: liệt kê các mã lỗi route có thể trả ở status đó */
export function describeErrorExamples(examples: Record<string, object>): string {
  const codes = new Set<string>();
  for (const example of Object.values(examples)) {
    if ('value' in example) codes.add((example.value as ErrorExampleValue).error.code);
  }
  return `Lỗi, error.code thuộc: ${[...codes].join(', ')}`;
}

/**
 * Khai báo các mã lỗi nghiệp vụ một route có thể trả, mỗi mã thành một ví dụ trong Swagger UI.
 * Truyền object khi route ném mã đó với message/details riêng:
 *   @ApiErrors(ErrorCode.AUTH_TOKEN_INVALID, { code: ErrorCode.NOT_FOUND, message: 'Tài khoản không còn tồn tại' })
 * Lỗi chung (400 VALIDATION_ERROR, 401 UNAUTHORIZED, 500) do addCommonErrorResponses tự thêm.
 */
export function ApiErrors(...specs: ApiErrorSpec[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(ErrorEnvelopeDto),
    ...[...groupErrorExamples(specs)].map(([status, examples]) =>
      ApiResponse({
        status,
        description: describeErrorExamples(examples),
        schema: { $ref: getSchemaPath(ErrorEnvelopeDto) },
        examples,
      }),
    ),
  );
}
