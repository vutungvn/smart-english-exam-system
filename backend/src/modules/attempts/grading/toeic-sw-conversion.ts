import { Skill } from '../../../generated/prisma/enums.js';

/**
 * Quy đổi điểm thô Speaking/Writing → thang TOEIC 0–200 (SPRINT-86). Đây là BẢNG THAM KHẢO dựng
 * theo tỉ lệ điểm thô (điểm đạt / điểm tối đa của các câu trong bài), KHÔNG phải bảng chính thức của
 * ETS. Tính theo tỉ lệ nên dùng được cả với đề ít câu hơn đề chuẩn.
 *
 * Mốc [tỉ lệ %, điểm]; giữa hai mốc nội suy tuyến tính rồi làm tròn tới bội số của 10 (điểm SW thật
 * cũng có bước 10).
 */
const ANCHORS: Record<'SPEAKING' | 'WRITING', [number, number][]> = {
  SPEAKING: [
    [0, 0],
    [20, 40],
    [40, 90],
    [55, 120],
    [70, 150],
    [85, 180],
    [95, 200],
    [100, 200],
  ],
  WRITING: [
    [0, 0],
    [20, 40],
    [35, 80],
    [50, 110],
    [65, 140],
    [80, 170],
    [90, 190],
    [100, 200],
  ],
};

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

/** Điểm 0–200 của một kỹ năng SW; kỹ năng LR hoặc điểm tối đa 0 thì null */
export function toeicSwScore(skill: Skill, raw: number, max: number): number | null {
  if ((skill !== Skill.SPEAKING && skill !== Skill.WRITING) || max <= 0) return null;
  const percent = Math.min(Math.max(raw / max, 0), 1) * 100;
  const anchors = ANCHORS[skill];
  const upper = anchors.findIndex(([x]) => x >= percent);
  const [x1, y1] = anchors[upper];
  const [x0, y0] = upper > 0 ? anchors[upper - 1] : anchors[upper];
  const value = x1 === x0 ? y1 : y0 + ((y1 - y0) * (percent - x0)) / (x1 - x0);
  return Math.round(value / 10) * 10;
}
