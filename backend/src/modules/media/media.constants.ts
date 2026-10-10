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
