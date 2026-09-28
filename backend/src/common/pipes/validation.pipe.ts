import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';

export interface FieldError {
  field: string;
  message: string;
}

// Làm phẳng lỗi lồng nhau: address.city, items.0.name
export function flattenValidationErrors(errors: ValidationError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const [message] = Object.values(error.constraints ?? {});
    const own = message ? [{ field, message }] : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true, // bỏ trường không khai báo trong DTO
    forbidNonWhitelisted: true, // ...và báo lỗi nếu client gửi trường lạ
    transform: true, // body/query thành instance của DTO
    stopAtFirstError: true, // mỗi trường chỉ một thông báo, FE gán thẳng vào ô nhập
    validationError: { target: false, value: false }, // không đính kèm giá trị (có thể là mật khẩu)
    exceptionFactory: (errors) =>
      new AppException(ErrorCode.VALIDATION_ERROR, undefined, flattenValidationErrors(errors)),
  });
}
