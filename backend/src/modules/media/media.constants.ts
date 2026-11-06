// Ảnh đại diện: key trong bucket là avatars/<uuid>.webp, phát ra ngoài qua GET /api/v1/media/avatars/<uuid>.webp
export const AVATAR_KEY_PREFIX = 'avatars/';
export const AVATAR_URL_PREFIX = '/api/v1/media/avatars/';

// Chỉ nhận đúng tên do hệ thống sinh: chặn luôn ../, ký tự lạ, đuôi khác
export const AVATAR_FILE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

// Mỗi lần đổi ảnh là một tên tệp mới nên trình duyệt được giữ ảnh vĩnh viễn
export const AVATAR_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export function avatarUrl(fileName: string): string {
  return AVATAR_URL_PREFIX + fileName;
}

/** Key trong bucket của ảnh do hệ thống lưu; null với ảnh Google hoặc URL khác */
export function avatarKeyFromUrl(url: string | null): string | null {
  if (!url?.startsWith(AVATAR_URL_PREFIX)) return null;
  const fileName = url.slice(AVATAR_URL_PREFIX.length);
  return AVATAR_FILE_PATTERN.test(fileName) ? AVATAR_KEY_PREFIX + fileName : null;
}

// Audio, ảnh của câu hỏi và nhóm câu: key questions/<uuid>.<đuôi>, phát qua
// GET /api/v1/media/questions/<uuid>_<đuôi>?exp=…&sig=… (URL ký, xem MediaUrlService).
// Đường dẫn KHÔNG có đuôi tệp (.mp3): trình quản lý tải xuống như IDM bắt mọi request có đuôi nằm
// trong danh sách loại tệp của nó (kể cả request fetch), trả cho trình duyệt một phản hồi rỗng
// (audio không phát được) và bật hộp thoại tải xuống.
export const QUESTION_MEDIA_KEY_PREFIX = 'questions/';
export const QUESTION_MEDIA_URL_PREFIX = '/api/v1/media/questions/';
/** Tên tệp trên URL: <uuid>_<đuôi>; vẫn nhận <uuid>.<đuôi> của URL ký phát ra trước đây (còn hạn vài giờ) */
export const QUESTION_MEDIA_FILE_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[._](mp3|jpg|png|webp)$/;

/** Định dạng tệp câu hỏi được nhận: đuôi lưu trong kho và Content-Type khi phát lại */
export const QUESTION_MEDIA_TYPES = {
  mp3: 'audio/mpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export type QuestionMediaExt = keyof typeof QUESTION_MEDIA_TYPES;

// Bài nói Speaking của học viên (đã chuẩn hóa MP3): key recordings/<uuid>.mp3, phát qua
// GET /api/v1/media/recordings/<uuid>_mp3?exp=…&sig=…; chỉ API bài làm của chính học viên phát URL này
export const RECORDING_KEY_PREFIX = 'recordings/';
export const RECORDING_URL_PREFIX = '/api/v1/media/recordings/';
export const RECORDING_FILE_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_mp3$/;
