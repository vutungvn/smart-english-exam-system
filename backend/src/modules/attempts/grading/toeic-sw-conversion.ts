import { Skill } from '../../../generated/prisma/enums.js';
import { CONVERSION_RULES, type ScoringSettings } from '../../../infra/settings/settings.schema.js';
import { convert } from './conversion.js';

/** Điểm thô tối đa của từng dạng câu (thang chấm của ETS; Speaking Part 1 = phát âm 0–3 + ngữ điệu 0–3) */
const OPEN_MAX_SCORE: Record<'SPEAKING' | 'WRITING', Record<number, number>> = {
  SPEAKING: { 1: 6, 2: 3, 3: 3, 4: 3, 5: 5 },
  WRITING: { 1: 3, 2: 4, 3: 5 },
};

/** Điểm tối đa của một câu Speaking/Writing; Part lạ (dữ liệu lỗi) tính thang 0–5 */
export function openMaxScore(skill: Skill, part: number): number {
  if (skill !== Skill.SPEAKING && skill !== Skill.WRITING) return 0;
  return OPEN_MAX_SCORE[skill][part] ?? 5;
}

/**
 * Điểm 0–200 của một kỹ năng SW theo bảng quy đổi admin cấu hình (D13). Tính theo tỉ lệ điểm thô (điểm
 * đạt / điểm tối đa của các câu trong bài) nên dùng được cả với đề ít câu hơn đề chuẩn; kỹ năng LR
 * hoặc điểm tối đa 0 thì null
 */
export function toeicSwScore(
  tables: ScoringSettings,
  skill: Skill,
  raw: number,
  max: number,
): number | null {
  if (max <= 0) return null;
  const percent = (raw / max) * 100;
  if (skill === Skill.SPEAKING) {
    return convert(tables.speaking, percent, CONVERSION_RULES.speaking.step);
  }
  if (skill === Skill.WRITING) {
    return convert(tables.writing, percent, CONVERSION_RULES.writing.step);
  }
  return null;
}
