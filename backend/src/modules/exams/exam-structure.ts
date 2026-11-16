import { ScoringScale, Skill } from '../../generated/prisma/enums.js';
import { TOEIC_PARTS } from '../questions/toeic-parts.js';

/**
 * Cấu trúc đề TOEIC chuẩn (Ke_hoach_trien_khai.md Mục 7.3): số câu mỗi Part.
 * Đề LR 200 câu (Listening 100 + Reading 100), đề Speaking 11 câu, đề Writing 8 câu.
 */
export interface PartQuota {
  skill: Skill;
  part: number;
  count: number;
}

const { LISTENING, READING, SPEAKING, WRITING } = Skill;

export const TOEIC_QUOTAS: readonly PartQuota[] = [
  { skill: LISTENING, part: 1, count: 6 },
  { skill: LISTENING, part: 2, count: 25 },
  { skill: LISTENING, part: 3, count: 39 },
  { skill: LISTENING, part: 4, count: 30 },
  { skill: READING, part: 5, count: 30 },
  { skill: READING, part: 6, count: 16 },
  { skill: READING, part: 7, count: 54 },
  { skill: SPEAKING, part: 1, count: 2 },
  { skill: SPEAKING, part: 2, count: 2 },
  { skill: SPEAKING, part: 3, count: 3 },
  { skill: SPEAKING, part: 4, count: 3 },
  { skill: SPEAKING, part: 5, count: 1 },
  { skill: WRITING, part: 1, count: 5 },
  { skill: WRITING, part: 2, count: 2 },
  { skill: WRITING, part: 3, count: 1 },
];

/** Kỹ năng được phép trong đề theo thang điểm: đề LR không chứa Part Speaking/Writing và ngược lại */
export const SCALE_SKILLS: Record<ScoringScale, readonly Skill[]> = {
  [ScoringScale.TOEIC_990]: [LISTENING, READING],
  [ScoringScale.TOEIC_SW]: [SPEAKING, WRITING],
  [ScoringScale.PERCENT]: [LISTENING, READING, SPEAKING, WRITING],
};

/** Thời gian chuẩn của đề TOEIC LR (phút) */
export const TOEIC_LR_MINUTES = 120;

/** Số câu mỗi nhóm theo định dạng TOEIC: L3, L4, S4 là 3 câu; R6 là 4 câu; R7 từ 2 đến 5 câu */
const GROUP_SIZES: Record<string, { min: number; max: number }> = {
  'LISTENING-3': { min: 3, max: 3 },
  'LISTENING-4': { min: 3, max: 3 },
  'READING-6': { min: 4, max: 4 },
  'READING-7': { min: 2, max: 5 },
  'SPEAKING-4': { min: 3, max: 3 },
};

export function quotaOf(skill: Skill, part: number): PartQuota | undefined {
  return TOEIC_QUOTAS.find((quota) => quota.skill === skill && quota.part === part);
}

export function groupSizeOf(skill: Skill, part: number): { min: number; max: number } | undefined {
  return GROUP_SIZES[`${skill}-${part}`];
}

/** Thứ tự chuẩn của Part trong đề, theo đúng thứ tự khai báo trong TOEIC_PARTS (L1…L4, R5…R7, S1…S5, W1…W3) */
export function partOrder(skill: Skill, part: number): number {
  return TOEIC_PARTS.findIndex((rule) => rule.skill === skill && rule.part === part);
}

/** Cắt ngắn nội dung câu để đưa vào thông báo lỗi */
export function excerpt(text: string, length = 40): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}
