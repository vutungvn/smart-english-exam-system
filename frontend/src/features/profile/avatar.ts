import { toApiError } from '@/api/errors';

// Khớp giới hạn của backend (POST /me/avatar): kiểm tra trước để khỏi tải lên rồi mới bị từ chối
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_ACCEPT = ACCEPTED_TYPES.join(',');

export function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Thông báo lỗi nếu tệp không dùng được làm ảnh đại diện, null nếu hợp lệ */
export function validateAvatarFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return `Ảnh nặng ${formatFileSize(file.size)}, vượt quá giới hạn 5 MB.`;
  }
  return null;
}

/** Thông báo lỗi tải ảnh: 413 của backend là thông báo chung, đổi cho rõ nghĩa */
export function describeAvatarError(error: unknown): string {
  const apiError = toApiError(error);
  return apiError.code === 'PAYLOAD_TOO_LARGE' ? 'Ảnh vượt quá giới hạn 5 MB.' : apiError.message;
}
