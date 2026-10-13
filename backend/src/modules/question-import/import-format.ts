import { Skill } from '../../generated/prisma/enums.js';

/**
 * Định dạng tệp nhập câu hỏi (Ke_hoach_soan_cau_hoi.md Mục 5): một tệp .zip gồm questions.xlsx
 * (2 sheet groups, questions) và thư mục media/ chứa audio, ảnh. Tệp mẫu và dữ liệu seed dùng chung
 * định dạng này.
 */

const MB = 1024 * 1024;

/** Giới hạn chống tệp quá lớn và "bom giải nén" (zip nhỏ nhưng giải nén ra rất lớn) */
export const IMPORT_LIMITS = {
  /** Tệp .zip tải lên (multer chặn trước khi đọc, trả 413) */
  zipBytes: 100 * MB,
  /** Số mục trong .zip, tính cả thư mục */
  zipEntries: 2000,
  /** Tổng kích thước sau giải nén của mọi tệp trong .zip */
  zipTotalBytes: 300 * MB,
  xlsxBytes: 10 * MB,
  /** .xlsx cũng là một tệp zip: tổng kích thước các phần XML bên trong sau giải nén */
  xlsxInnerBytes: 100 * MB,
  xlsxInnerEntries: 500,
  audioBytes: 20 * MB,
  imageBytes: 5 * MB,
  groupRows: 500,
  questionRows: 2000,
} as const;

export const SHEET = { groups: 'groups', questions: 'questions' } as const;
export type SheetName = (typeof SHEET)[keyof typeof SHEET];

export const MEDIA_DIR = 'media/';

/** Cột sheet groups, đúng thứ tự trong tệp mẫu */
export const GROUP_COLUMNS = [
  'group_code',
  'subject_code',
  'skill',
  'topic',
  'part',
  'passage',
  'transcript',
  'audio_file',
  'image_file',
  'source',
] as const;

/** Cột sheet questions, đúng thứ tự trong tệp mẫu */
export const QUESTION_COLUMNS = [
  'question_code',
  'subject_code',
  'skill',
  'topic',
  'type',
  'part',
  'difficulty',
  'group_code',
  'order_in_group',
  'content',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct',
  'prep_seconds',
  'response_seconds',
  'sample_answer',
  'explanation',
  'audio_file',
  'image_file',
  'tags',
  'source',
] as const;

export type GroupColumn = (typeof GROUP_COLUMNS)[number];
export type QuestionColumn = (typeof QUESTION_COLUMNS)[number];

/** Cột phải có trên dòng tiêu đề (cột có thể để trống ở từng dòng thì không bắt buộc có) */
export const REQUIRED_GROUP_COLUMNS: readonly GroupColumn[] = [
  'group_code',
  'subject_code',
  'skill',
  'topic',
  'part',
];
export const REQUIRED_QUESTION_COLUMNS: readonly QuestionColumn[] = [
  'question_code',
  'subject_code',
  'skill',
  'topic',
  'type',
  'part',
  'difficulty',
  'content',
  'explanation',
];

/** Mã câu, mã nhóm: chữ, số, dấu chấm, gạch ngang, gạch dưới; lưu chữ hoa */
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,49}$/;

/** Tên tệp trong media/: không có thư mục con, không có ../ */
export const MEDIA_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(mp3|jpe?g|png|webp)$/i;

/** Writing Part 1: dòng cuối của content là hai từ cho trước, ví dụ "Words: airport / because" */
export const WRITING_WORDS_PATTERN = /^words:\s*[^/]*\S[^/]*\/[^/]*\S[^/]*$/i;

export type MediaKind = 'audio' | 'image';

/** Part nào được gắn audio/ảnh (ở câu hay ở nhóm), và Part nào nên có (thiếu thì cảnh báo) */
interface MediaRule {
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
