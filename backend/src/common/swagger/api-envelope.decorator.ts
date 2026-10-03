import { applyDecorators, HttpStatus } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import type { ReferenceObject, SchemaObject } from '@nestjs/swagger';
import { PaginationMetaDto } from './envelope.schemas.js';

interface EnvelopeOptions {
  /** Mặc định 200; POST không có @HttpCode thì truyền HttpStatus.CREATED */
  status?: HttpStatus;
  description?: string;
}

// { success: true, status, data, meta? } — khớp với TransformInterceptor
function envelopeSchema(
  status: number,
  data: SchemaObject | ReferenceObject,
  withMeta = false,
): SchemaObject {
  return {
    type: 'object',
    required: withMeta ? ['success', 'status', 'data', 'meta'] : ['success', 'status', 'data'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      status: { type: 'integer', example: status },
      data,
      ...(withMeta ? { meta: { $ref: getSchemaPath(PaginationMetaDto) } } : {}),
    },
  };
}

/** Response trả một object: { success, status, data: Model } */
export function ApiEnvelope<T>(
  model: Type<T>,
  { status = HttpStatus.OK, description = 'Thành công' }: EnvelopeOptions = {},
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: envelopeSchema(status, { $ref: getSchemaPath(model) }),
    }),
  );
}

/** Response danh sách có phân trang (service trả WithMeta): { success, status, data: Model[], meta } */
export function ApiPaginatedEnvelope<T>(
  model: Type<T>,
  { status = HttpStatus.OK, description = 'Thành công' }: EnvelopeOptions = {},
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiResponse({
      status,
      description,
      schema: envelopeSchema(
        status,
        { type: 'array', items: { $ref: getSchemaPath(model) } },
        true,
      ),
    }),
  );
}

/** Response của route trả void: { success, status, data: null } */
export function ApiNullEnvelope({
  status = HttpStatus.OK,
  description = 'Thành công',
}: EnvelopeOptions = {}): MethodDecorator & ClassDecorator {
  return ApiResponse({
    status,
    description,
    schema: envelopeSchema(status, { type: 'object', nullable: true, example: null }),
  });
}
