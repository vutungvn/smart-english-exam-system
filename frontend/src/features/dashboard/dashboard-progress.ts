import type { ScoreTrendPoint, Skill } from '@/api/generated';

export interface ToeicSummary {
  /** Bài làm cả đề TOEIC LR đã có điểm, mới nhất */
  latest: ScoreTrendPoint | null;
  /** Bài TOEIC LR có điểm ngay trước bài mới nhất (để tính mức tăng giảm) */
  previous: ScoreTrendPoint | null;
}

/** Hai bài TOEIC LR có điểm gần nhất (điểm theo thời gian, cũ nhất trước) */
export function toeicSummary(points: ScoreTrendPoint[]): ToeicSummary {
  const scored = points.filter((p) => p.scoring === 'TOEIC_990' && p.scaledScore !== null);
  return { latest: scored.at(-1) ?? null, previous: scored.at(-2) ?? null };
}

/** Điểm quy đổi của một kỹ năng trong bài (TOEIC LR: 5–495); null khi không có */
export function skillScaled(point: ScoreTrendPoint | null, skill: Skill): number | null {
  return point?.skillScores.find((item) => item.skill === skill)?.scaled ?? null;
}
