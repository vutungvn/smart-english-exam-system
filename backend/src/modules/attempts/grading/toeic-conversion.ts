import { Skill } from '../../../generated/prisma/enums.js';
import { CONVERSION_RULES, type ScoringSettings } from '../../../infra/settings/settings.schema.js';
import { convert } from './conversion.js';

/**
 * Điểm Listening/Reading (5–495) theo bảng quy đổi admin cấu hình (D13); số câu đúng ngoài 0–100 được
 * ép vào khoảng đó. Kỹ năng khác trả null
 */
export function toeicLrScore(
  tables: ScoringSettings,
  skill: Skill,
  correct: number,
): number | null {
  if (skill === Skill.LISTENING) {
    return convert(tables.listening, Math.trunc(correct), CONVERSION_RULES.listening.step);
  }
  if (skill === Skill.READING) {
    return convert(tables.reading, Math.trunc(correct), CONVERSION_RULES.reading.step);
  }
  return null;
}
