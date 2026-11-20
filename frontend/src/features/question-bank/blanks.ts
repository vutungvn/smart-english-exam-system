import type { Skill } from '@/api/generated';

/**
 * Reading Part 6: ngân hàng câu hỏi đánh dấu chỗ trống theo thứ tự trong nhóm ([1]…[4]) vì mỗi đề
 * đánh số khác nhau. Khi hiển thị đề thì đổi [n] sang số câu thật (131, 132…) cho học viên khỏi
 * nhầm. Part 7 cũng dùng [1]…[4] (vị trí chèn câu) nên không được đổi.
 */
export function isTextCompletion(skill: Skill, part: number): boolean {
  return skill === 'READING' && part === 6;
}

/**
 * Thứ tự trong nhóm → số câu của đề. Các câu trong một khối luôn xếp theo orderInGroup tăng dần
 * (BE collectGroups, trộn đề giữ nguyên khối), nên [n] ứng với câu thứ n của khối.
 * Truyền toàn bộ câu của khối, không truyền danh sách đã lọc.
 */
export function blankNumbers(questions: ReadonlyArray<{ number: number }>): Map<number, number> {
  return new Map(questions.map((question, index) => [index + 1, question.number]));
}

/** Dấu chỗ trống trong đoạn văn: "-------[1]-------", "[1] ___", "[1]" (gồm cả gạch hai bên) */
export const PASSAGE_BLANK = /(?:[-_]{2,}\s*)?\[(\d+)\](?:\s*[-_]{2,})?/g;

/** Câu hỏi: "Chọn phương án … cho chỗ trống [1]." → "… cho chỗ trống 131." */
export function fillBlankNumbers(text: string, blanks: Map<number, number>): string {
  return text.replace(/\[(\d+)\]/g, (match, order: string) => {
    const number = blanks.get(Number(order));
    return number === undefined ? match : String(number);
  });
}
