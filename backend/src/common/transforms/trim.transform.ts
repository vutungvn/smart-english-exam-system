import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';

// Cắt khoảng trắng hai đầu trước khi validate (email, họ tên)
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  );
