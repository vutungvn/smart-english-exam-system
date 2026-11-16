import { getSchemaPath } from '@nestjs/swagger';
import type {
  OpenAPIObject,
  OperationObject,
  ReferenceObject,
  ResponseObject,
  SchemaObject,
} from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-codes.js';
import { describeErrorExamples, groupErrorExamples } from './api-errors.decorator.js';
import type { ApiErrorSpec } from './api-errors.decorator.js';
import { ErrorEnvelopeDto } from './envelope.schemas.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'] as const;

function* operations(document: OpenAPIObject): Generator<OperationObject> {
  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) yield operation;
    }
  }
}

function resolveSchema(
  document: OpenAPIObject,
  schema: SchemaObject | ReferenceObject | undefined,
): SchemaObject | undefined {
  if (!schema || !('$ref' in schema)) return schema;
  const name = schema.$ref.split('/').pop() ?? '';
  return document.components?.schemas?.[name] as SchemaObject | undefined;
}

/** Trường đầu tiên route nhận (body, rồi query/path) để ví dụ VALIDATION_ERROR khớp với route */
function firstInputField(document: OpenAPIObject, operation: OperationObject): string | undefined {
  const body = operation.requestBody;
  if (body && !('$ref' in body)) {
    const schema = resolveSchema(document, body.content['application/json']?.schema);
    const field = schema?.required?.[0] ?? Object.keys(schema?.properties ?? {})[0];
    if (field) return field;
  }

  const parameter = operation.parameters?.find((param) => !('$ref' in param));
  return parameter && 'name' in parameter ? parameter.name : undefined;
}

/** Lỗi chung theo đặc điểm route, mỗi lỗi là một ví dụ trong Swagger UI */
function commonErrors(document: OpenAPIObject, operation: OperationObject): ApiErrorSpec[] {
  const errors: ApiErrorSpec[] = [];

  const needsBearer = operation.security?.some((requirement) => 'bearer' in requirement);
  if (needsBearer) errors.push(ErrorCode.UNAUTHORIZED);

  const field = firstInputField(document, operation);
  if (field) {
    errors.push({
      code: ErrorCode.VALIDATION_ERROR,
      details: [{ field, message: `${field} không hợp lệ` }],
    });
  }

  errors.push(ErrorCode.INTERNAL_SERVER_ERROR);
  return errors;
}

/**
 * Thêm lỗi chung cho mọi route, để từng route chỉ phải khai báo lỗi nghiệp vụ bằng @ApiErrors:
 * - cần access token (@ApiBearerAuth) → 401 UNAUTHORIZED
 * - có body hoặc tham số (path/query) → 400 VALIDATION_ERROR (có details theo trường của route)
 * - mọi route → 500 INTERNAL_SERVER_ERROR
 * Status route đã khai báo bằng @ApiErrors thì gộp thêm ví dụ vào, không ghi đè ví dụ của route.
 */
export function addCommonErrorResponses(document: OpenAPIObject): void {
  for (const operation of operations(document)) {
    for (const [status, examples] of groupErrorExamples(commonErrors(document, operation))) {
      const existing = operation.responses[status] as ResponseObject | undefined;
      const content = existing?.content?.['application/json'];

      // Route đã có status này (ví dụ 400 AUTH_TOKEN_INVALID): ví dụ của route đứng trước và được giữ
      const merged = { ...content?.examples };
      for (const [key, example] of Object.entries(examples)) merged[key] ??= example;

      operation.responses[status] = {
        description: describeErrorExamples(merged),
        content: {
          'application/json': {
            schema: content?.schema ?? { $ref: getSchemaPath(ErrorEnvelopeDto) },
            examples: merged,
          },
        },
      };
    }
  }
}

/** operationId trùng làm codegen sinh hai hook cùng tên; trả về danh sách bị trùng */
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
