import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-codes.js';
import type { PaginationMeta } from '../utils/pagination.js';

// Schema OpenAPI cho phần vỏ response; dữ liệu thật vẫn do TransformInterceptor/AllExceptionsFilter tạo

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ type: 'integer', example: 1 })
  page: number;

  @ApiProperty({ type: 'integer', example: 20 })
  limit: number;

  @ApiProperty({ type: 'integer', example: 42 })
  total: number;

  @ApiProperty({ type: 'integer', example: 3, description: '0 khi không có bản ghi nào' })
  totalPages: number;
}

export class FieldErrorDto {
  @ApiProperty({ example: 'email', description: 'Trường lỗi, trường lồng nhau dạng address.city' })
  field: string;

  @ApiProperty({ example: 'Email không hợp lệ' })
  message: string;
}

export class ErrorBodyDto {
  @ApiProperty({ enum: ErrorCode, enumName: 'ErrorCode', example: ErrorCode.VALIDATION_ERROR })
  code: ErrorCode;

  @ApiProperty({ example: 'Dữ liệu gửi lên không hợp lệ' })
  message: string;

  @ApiProperty({
    type: [FieldErrorDto],
    required: false,
    description:
      'VALIDATION_ERROR: danh sách lỗi theo trường. Mã khác có thể chứa dữ liệu riêng, ví dụ { retryAfterSeconds }',
  })
  details?: unknown;
}

export class ErrorEnvelopeDto {
  @ApiProperty({ type: Boolean, enum: [false] })
  success: false;

  @ApiProperty({ type: 'integer', example: 400, description: 'Luôn trùng HTTP status code' })
  status: number;

  @ApiProperty({ type: ErrorBodyDto })
  error: ErrorBodyDto;
}
