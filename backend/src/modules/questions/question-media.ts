import { fileTypeFromBuffer } from 'file-type';
import { Skill } from '../../generated/prisma/enums.js';
import type { QuestionMediaExt } from '../media/media.constants.js';

/**
 * Quy tắc audio/ảnh của câu hỏi và nhóm câu, dùng chung cho nhập tệp .zip (SPRINT-45) và tải lên
 * trong form câu hỏi: Part nào được gắn loại tệp nào, định dạng nhận theo nội dung, dung lượng tối đa
 */

export type MediaKind = 'audio' | 'image';
export const MEDIA_KINDS: readonly MediaKind[] = ['audio', 'image'];

const MB = 1024 * 1024;
export const MEDIA_LIMITS: Record<MediaKind, number> = {
  audio: 20 * MB,
  image: 5 * MB,
};

export const MEDIA_LABEL: Record<MediaKind, string> = { audio: 'âm thanh', image: 'hình ảnh' };

/** allowed: Part được gắn loại tệp này · recommended: nên có (thiếu thì cảnh báo khi nhập/xuất bản) */
export interface MediaRule {
  allowed: boolean;
  recommended: boolean;
}

const key = (skill: Skill, part: number) => `${skill}-${part}`;

// Câu: L1 ảnh + audio; L2 audio; S2, W1 ảnh; S3, S4 audio đọc câu hỏi
const QUESTION_AUDIO = new Set([
  key(Skill.LISTENING, 1),
  key(Skill.LISTENING, 2),
  key(Skill.SPEAKING, 3),
  key(Skill.SPEAKING, 4),
]);
const QUESTION_IMAGE = new Set([
  key(Skill.LISTENING, 1),
  key(Skill.SPEAKING, 2),
  key(Skill.WRITING, 1),
]);
// Nhóm: L3, L4 audio hội thoại; biểu đồ L3, L4, ảnh đoạn văn R6, R7, bảng thông tin S4
const GROUP_AUDIO = new Set([key(Skill.LISTENING, 3), key(Skill.LISTENING, 4)]);
const GROUP_IMAGE = new Set([
  key(Skill.LISTENING, 3),
  key(Skill.LISTENING, 4),
  key(Skill.READING, 6),
  key(Skill.READING, 7),
  key(Skill.SPEAKING, 4),
]);

export function questionMediaRule(kind: MediaKind, skill: Skill, part: number): MediaRule {
  const set = kind === 'audio' ? QUESTION_AUDIO : QUESTION_IMAGE;
  const has = set.has(key(skill, part));
  return { allowed: has, recommended: has };
}

export function groupMediaRule(kind: MediaKind, skill: Skill, part: number): MediaRule {
  const k = key(skill, part);
  if (kind === 'audio') return { allowed: GROUP_AUDIO.has(k), recommended: GROUP_AUDIO.has(k) };
  // Ảnh của nhóm là tùy chọn (chỉ một số đoạn hội thoại có biểu đồ)
  return { allowed: GROUP_IMAGE.has(k), recommended: false };
}

/** Định dạng nhận được, nhận dạng theo NỘI DUNG tệp (không tin đuôi tệp hay Content-Type) */
const SNIFFED: Record<string, { kind: MediaKind; ext: QuestionMediaExt }> = {
  'audio/mpeg': { kind: 'audio', ext: 'mp3' },
  'image/jpeg': { kind: 'image', ext: 'jpg' },
  'image/png': { kind: 'image', ext: 'png' },
  'image/webp': { kind: 'image', ext: 'webp' },
};

/** null khi nội dung không phải MP3 hay ảnh JPG/PNG/WebP */
export async function sniffMedia(
  data: Uint8Array,
): Promise<{ kind: MediaKind; ext: QuestionMediaExt } | null> {
  return SNIFFED[(await fileTypeFromBuffer(data))?.mime ?? ''] ?? null;
}
