import { HttpStatus } from '@nestjs/common';
import { getSchemaPath } from '@nestjs/swagger';
import type { OpenAPIObject, OperationObject, ResponseObject } from '@nestjs/swagger';
import { describeErrorStatus } from './api-errors.decorator.js';
import { ErrorEnvelopeDto } from './envelope.schemas.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'] as const;

function errorResponse(status: HttpStatus): ResponseObject {
  return {
    description: describeErrorStatus(status),
    content: { 'application/json': { schema: { $ref: getSchemaPath(ErrorEnvelopeDto) } } },
  };
}

function* operations(document: OpenAPIObject): Generator<OperationObject> {
  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) yield operation;
    }
  }
}

/**
 * Thêm lỗi chung cho mọi route, để từng route chỉ phải khai báo lỗi nghiệp vụ bằng @ApiErrors:
 * - cần access token (@ApiBearerAuth) → 401
 * - có body hoặc tham số (path/query) → 400 (lỗi validate, có details)
 * - mọi route → 500
 * Status nào route đã tự khai báo thì giữ nguyên.
 */
export function addCommonErrorResponses(document: OpenAPIObject): void {
  for (const operation of operations(document)) {
    const statuses: HttpStatus[] = [];

    const needsBearer = operation.security?.some((requirement) => 'bearer' in requirement);
    if (needsBearer) statuses.push(HttpStatus.UNAUTHORIZED);

    if (operation.requestBody || (operation.parameters?.length ?? 0) > 0) {
      statuses.push(HttpStatus.BAD_REQUEST);
    }

    statuses.push(HttpStatus.INTERNAL_SERVER_ERROR);

    for (const status of statuses) {
      operation.responses[status] ??= errorResponse(status);
    }
  }
}

/** operationId trùng làm Orval sinh hai hook cùng tên; trả về danh sách bị trùng */
export function findDuplicateOperationIds(document: OpenAPIObject): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const { operationId } of operations(document)) {
    if (!operationId) continue;
    if (seen.has(operationId)) duplicates.add(operationId);
    seen.add(operationId);
  }

  return [...duplicates];
}
