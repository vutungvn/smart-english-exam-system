import type { ScoreTrendPoint, Skill } from '@/api/generated';

export interface ToeicSummary {
  /** Bài làm cả đề đã có điểm, mới nhất */
  latest: ScoreTrendPoint | null;
  /** Bài có điểm ngay trước bài mới nhất (để tính mức tăng giảm) */
  previous: ScoreTrendPoint | null;
}

/** Hai bài TOEIC LR có điểm gần nhất (điểm theo thời gian, cũ nhất trước) */
export function toeicSummary(points: ScoreTrendPoint[]): ToeicSummary {
  const scored = points.filter((p) => p.scoring === 'TOEIC_990' && p.scaledScore !== null);
  return { latest: scored.at(-1) ?? null, previous: scored.at(-2) ?? null };
}

/**
 * Hai bài làm cả đề TOEIC SW gần nhất đã có điểm của kỹ năng. Đề SW có thể chỉ gồm Speaking hoặc
 * Writing nên lọc theo từng kỹ năng
 */
export function swSummary(points: ScoreTrendPoint[], skill: Skill): ToeicSummary {
  const scored = points.filter((p) => p.scoring === 'TOEIC_SW' && skillScaled(p, skill) !== null);
  return { latest: scored.at(-1) ?? null, previous: scored.at(-2) ?? null };
}

/** Điểm quy đổi của một kỹ năng trong bài (TOEIC LR: 5–495, SW: 0–200); null khi không có */
export function skillScaled(point: ScoreTrendPoint | null, skill: Skill): number | null {
  return point?.skillScores.find((item) => item.skill === skill)?.scaled ?? null;
}
