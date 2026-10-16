import { Skill } from '../../../generated/prisma/enums.js';

/**
 * Bảng quy đổi số câu đúng → điểm TOEIC Listening/Reading (5–495 mỗi kỹ năng). Đây là BẢNG THAM KHẢO
 * dựng từ các mốc phổ biến trên tài liệu luyện thi, KHÔNG phải bảng chính thức của ETS (ETS quy đổi
 * riêng theo từng đề). D13: sau này chuyển vào system_settings để admin chỉnh, hiện để trong code.
 *
 * Mốc [số câu đúng, điểm]; giữa hai mốc nội suy tuyến tính rồi làm tròn tới bội số của 5.
 */
const ANCHORS: Record<'LISTENING' | 'READING', [number, number][]> = {
  LISTENING: [
    [0, 5],
    [10, 20],
    [20, 70],
    [30, 125],
    [40, 185],
    [50, 250],
    [60, 310],
    [70, 370],
    [80, 430],
    [90, 480],
    [95, 495],
    [100, 495],
  ],
  READING: [
    [0, 5],
    [10, 10],
    [20, 55],
    [30, 110],
    [40, 165],
    [50, 220],
    [60, 280],
    [70, 335],
    [80, 395],
    [90, 450],
    [95, 475],
    [100, 495],
  ],
};

/** Số câu mỗi kỹ năng của đề TOEIC LR */
export const TOEIC_LR_QUESTIONS_PER_SKILL = 100;

function buildTable(anchors: [number, number][]): number[] {
  const table: number[] = [];
  for (let correct = 0; correct <= TOEIC_LR_QUESTIONS_PER_SKILL; correct++) {
    const upper = anchors.findIndex(([raw]) => raw >= correct);
    const [x1, y1] = anchors[upper];
    const [x0, y0] = upper > 0 ? anchors[upper - 1] : anchors[upper];
    const value = x1 === x0 ? y1 : y0 + ((y1 - y0) * (correct - x0)) / (x1 - x0);
    table.push(Math.round(value / 5) * 5);
  }
  return table;
}

export const TOEIC_LR_TABLE = {
  LISTENING: buildTable(ANCHORS.LISTENING),
  READING: buildTable(ANCHORS.READING),
} as const;

/** Điểm quy đổi của một kỹ năng; số câu đúng ngoài 0–100 được ép vào khoảng đó */
export function toeicLrScore(skill: Skill, correct: number): number | null {
  if (skill !== Skill.LISTENING && skill !== Skill.READING) return null;
  const index = Math.min(Math.max(Math.trunc(correct), 0), TOEIC_LR_QUESTIONS_PER_SKILL);
  return TOEIC_LR_TABLE[skill][index];
}
