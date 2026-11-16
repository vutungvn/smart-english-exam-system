import { Skill } from '../../generated/prisma/enums.js';
import { partOrder } from '../exams/exam-structure.js';
import { findPartRule } from '../questions/toeic-parts.js';
import type { AccuracyStat, PartProgress, SkillProgress, TopicProgress } from './progress.types.js';

export const PROGRESS_RANGES = ['30d', '90d', '1y', 'all'] as const;
export type ProgressRange = (typeof PROGRESS_RANGES)[number];

/** Chủ đề phải có ít nhất ngần này câu đã làm mới đủ căn cứ kết luận yếu hay không */
export const MIN_TOPIC_QUESTIONS = 5;
/** Chủ đề có tỉ lệ đúng dưới mức này (%) là chủ đề yếu */
export const WEAK_ACCURACY = 80;
/** Số chủ đề yếu tối đa trả về */
export const WEAK_TOPIC_LIMIT = 5;

const DAY = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<Exclude<ProgressRange, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

/** Mốc bắt đầu của khoảng thời gian; null: toàn bộ */
export function sinceOf(range: ProgressRange, now: Date): Date | null {
  return range === 'all' ? null : new Date(now.getTime() - RANGE_DAYS[range] * DAY);
}

/** % đúng, làm tròn 1 chữ số; null khi chưa làm câu nào */
export function percentOf(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 1000) / 10 : null;
}

/** Một nhóm câu trắc nghiệm (kỹ năng, Part, chủ đề) trong các bài đã nộp */
export interface ScopeRow {
  skill: Skill;
  part: number;
  topicId: string;
  /** Số lượt câu (một câu làm ở 2 bài tính 2 lượt) */
  total: number;
  correct: number;
  wrong: number;
}

function sum(rows: ScopeRow[]): AccuracyStat {
  const total = rows.reduce((acc, row) => acc + row.total, 0);
  const correct = rows.reduce((acc, row) => acc + row.correct, 0);
  const wrong = rows.reduce((acc, row) => acc + row.wrong, 0);
  // Bỏ trống tính là chưa đúng, giống cách chấm điểm lúc nộp bài
  return {
    total,
    correct,
    wrong,
    skipped: total - correct - wrong,
    accuracy: percentOf(correct, total),
  };
}

function groupBy<K>(rows: ScopeRow[], key: (row: ScopeRow) => K): Map<K, ScopeRow[]> {
  const groups = new Map<K, ScopeRow[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

const SKILL_ORDER: readonly Skill[] = [
  Skill.LISTENING,
  Skill.READING,
  Skill.SPEAKING,
  Skill.WRITING,
];

/** Theo kỹ năng, theo thứ tự Listening, Reading, Speaking, Writing */
export function skillStats(rows: ScopeRow[]): SkillProgress[] {
  return [...groupBy(rows, (row) => row.skill)]
    .map(([skill, items]) => ({ skill, ...sum(items) }))
    .sort((a, b) => SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill));
}

/** Theo Part, đúng thứ tự trong đề TOEIC (L1…L4, R5…R7) */
export function partStats(rows: ScopeRow[]): PartProgress[] {
  return [...groupBy(rows, (row) => `${row.skill}-${row.part}`)]
    .map(([, items]) => {
      const { skill, part } = items[0];
      return {
        skill,
        part,
        name: findPartRule(skill, part)?.name ?? `Part ${part}`,
        ...sum(items),
      };
    })
    .sort((a, b) => partOrder(a.skill, a.part) - partOrder(b.skill, b.part));
}

export interface TopicInfo {
  id: string;
  name: string;
  skill: Skill;
  parts: number[];
}

/**
 * Chủ đề yếu: đủ MIN_TOPIC_QUESTIONS lượt câu và tỉ lệ đúng dưới WEAK_ACCURACY; yếu nhất trước,
 * bằng nhau thì chủ đề làm nhiều câu hơn trước (càng nhiều câu càng chắc là yếu thật)
 */
export function weakTopics(
  rows: ScopeRow[],
  topics: ReadonlyMap<string, TopicInfo>,
): TopicProgress[] {
  return [...groupBy(rows, (row) => row.topicId)]
    .map(([topicId, items]) => ({ topicId, stat: sum(items) }))
    .filter(
      ({ stat }) =>
        stat.total >= MIN_TOPIC_QUESTIONS &&
        stat.accuracy !== null &&
        stat.accuracy < WEAK_ACCURACY,
    )
    .sort((a, b) => (a.stat.accuracy ?? 0) - (b.stat.accuracy ?? 0) || b.stat.total - a.stat.total)
    .slice(0, WEAK_TOPIC_LIMIT)
    .flatMap(({ topicId, stat }) => {
      const topic = topics.get(topicId);
      return topic
        ? [{ topicId, name: topic.name, skill: topic.skill, parts: topic.parts, ...stat }]
        : [];
    });
}

/** Tổng câu trắc nghiệm của mọi kỹ năng */
export function totalStat(rows: ScopeRow[]): AccuracyStat {
  return sum(rows);
}
