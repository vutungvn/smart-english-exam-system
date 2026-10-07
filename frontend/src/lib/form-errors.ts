import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '@/api/errors';

/**
 * Gắn lỗi VALIDATION_ERROR của server vào từng ô của form.
 * `fields`: các ô có trên form; lỗi của trường không hiển thị (ví dụ token) bị bỏ qua.
 * Trả về true nếu đã gắn được ít nhất một lỗi, false để nơi gọi tự hiện lỗi chung.
 */
export function applyFieldErrors<T extends FieldValues>(
  apiError: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  let applied = false;
  for (const { field, message } of apiError.fieldErrors) {
    const name = fields.find((f) => f === field);
    if (!name) continue;
    setError(name, { type: 'server', message }, { shouldFocus: !applied });
    applied = true;
  }
  return applied;
}
