import { toApiError } from '@/api/errors';
import { formatFileSize } from '@/features/profile/avatar';

/**
 * Audio/ảnh của câu hỏi và nhóm câu. Khớp giới hạn backend (questions/question-media.ts): kiểm tra
 * trước để khỏi tải lên rồi mới bị từ chối. Backend vẫn nhận dạng lại theo nội dung tệp.
 */
export type MediaKind = 'audio' | 'image';

const MB = 1024 * 1024;
export const MEDIA_LIMITS: Record<MediaKind, number> = { audio: 20 * MB, image: 5 * MB };

const TYPES: Record<MediaKind, string[]> = {
  audio: ['audio/mpeg', 'audio/mp3'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
};
const EXTENSIONS: Record<MediaKind, RegExp> = {
  audio: /\.mp3$/i,
  image: /\.(jpe?g|png|webp)$/i,
};

export const MEDIA_ACCEPT: Record<MediaKind, string> = {
  audio: 'audio/mpeg,.mp3',
  image: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
};

export const MEDIA_FORMAT_HINT: Record<MediaKind, string> = {
  audio: 'MP3, tối đa 20 MB',
  image: 'JPG, PNG hoặc WebP, tối đa 5 MB',
};

/** Thông báo lỗi nếu tệp sai loại hoặc quá lớn, null nếu hợp lệ */
export function validateMediaFile(kind: MediaKind, file: File): string | null {
  // Một số máy (Windows) để trống file.type với MP3: chấp nhận khi đúng loại hoặc đúng đuôi
  if (!TYPES[kind].includes(file.type) && !EXTENSIONS[kind].test(file.name)) {
    return kind === 'audio' ? 'Chỉ nhận tệp âm thanh MP3.' : 'Chỉ nhận ảnh JPG, PNG hoặc WebP.';
  }
  if (file.size > MEDIA_LIMITS[kind]) {
    return `Tệp nặng ${formatFileSize(file.size)}, vượt quá giới hạn ${MEDIA_LIMITS[kind] / MB} MB.`;
  }
  return null;
}

/** Lỗi tải tệp từ backend: lỗi Part gắn ở trường `kind`, 413 là thông báo chung */
export function describeMediaError(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.fieldErrors.length) return apiError.fieldErrors[0].message;
  if (apiError.code === 'PAYLOAD_TOO_LARGE') return 'Tệp vượt quá giới hạn 20 MB.';
  return apiError.message;
}
