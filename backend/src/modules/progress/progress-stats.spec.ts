import { describe, expect, it } from 'vitest';
import { Skill } from '../../generated/prisma/enums.js';
import {
  openPartStats,
  openSkillStats,
  partStats,
  percentOf,
  sinceOf,
  skillStats,
  totalStat,
  weakTopics,
  type OpenScopeRow,
  type ScopeRow,
  type TopicInfo,
} from './progress-stats.js';

const { LISTENING, READING, SPEAKING, WRITING } = Skill;
const row = (
  skill: Skill,
  part: number,
  topicId: string,
  total: number,
  correct: number,
  wrong: number,
): ScopeRow => ({
  skill,
  part,
  topicId,
  total,
  correct,
  wrong,
});
const topic = (id: string, skill: Skill, part: number): TopicInfo => ({
  id,
  name: `Chủ đề ${id}`,
  skill,
  parts: [part],
});

describe('percentOf, sinceOf', () => {
  it('làm tròn 1 chữ số; chưa làm câu nào thì null', () => {
    expect(percentOf(2, 3)).toBe(66.7);
    expect(percentOf(0, 4)).toBe(0);
    expect(percentOf(0, 0)).toBeNull();
  });

  it('khoảng thời gian tính lùi từ bây giờ; all là toàn bộ', () => {
    const now = new Date('2026-10-17T00:00:00Z');
    expect(sinceOf('30d', now)?.toISOString()).toBe('2026-09-17T00:00:00.000Z');
    expect(sinceOf('90d', now)?.toISOString()).toBe('2026-07-19T00:00:00.000Z');
    expect(sinceOf('all', now)).toBeNull();
  });
});

describe('thống kê theo kỹ năng, Part', () => {
  const rows = [
    row(READING, 5, 'r5a', 4, 2, 1), // 1 câu bỏ trống
    row(LISTENING, 3, 'l3', 3, 3, 0),
    row(READING, 5, 'r5b', 6, 3, 3),
    row(LISTENING, 1, 'l1', 2, 1, 1),
  ];

  it('gộp theo kỹ năng, Listening trước Reading; bỏ trống tính là chưa đúng', () => {
    expect(skillStats(rows)).toEqual([
      { skill: LISTENING, total: 5, correct: 4, wrong: 1, skipped: 0, accuracy: 80 },
      { skill: READING, total: 10, correct: 5, wrong: 4, skipped: 1, accuracy: 50 },
    ]);
  });

  it('gộp theo Part, đúng thứ tự trong đề, có tên Part', () => {
    expect(
      partStats(rows).map((p) => [`${p.skill[0]}${p.part}`, p.name, p.total, p.accuracy]),
    ).toEqual([
      ['L1', 'Photographs', 2, 50],
      ['L3', 'Conversations', 3, 100],
      ['R5', 'Incomplete Sentences', 10, 50],
    ]);
  });

  it('tổng chung mọi kỹ năng', () => {
    expect(totalStat(rows)).toEqual({ total: 15, correct: 9, wrong: 5, skipped: 1, accuracy: 60 });
  });
});

describe('chủ đề yếu', () => {
  const topics = new Map(
    [
      topic('a', READING, 5),
      topic('b', READING, 5),
      topic('c', LISTENING, 3),
      topic('d', READING, 7),
      topic('e', READING, 6),
    ].map((t) => [t.id, t]),
  );

  it('chỉ chủ đề đủ 5 câu và đúng dưới 80%; yếu nhất trước', () => {
    const result = weakTopics(
      [
        row(READING, 5, 'a', 5, 2, 3), // 40%
        row(READING, 5, 'b', 4, 0, 4), // 0% nhưng mới 4 câu → chưa đủ căn cứ
        row(LISTENING, 3, 'c', 10, 8, 2), // 80% → không yếu
        row(READING, 7, 'd', 6, 1, 2), // 16.7%
        row(READING, 6, 'e', 3, 1, 1), // gộp với dòng dưới: 8 câu, 50%
        row(READING, 6, 'e', 5, 3, 2),
      ],
      topics,
    );
    expect(result.map((t) => [t.topicId, t.total, t.accuracy])).toEqual([
      ['d', 6, 16.7],
      ['a', 5, 40],
      ['e', 8, 50],
    ]);
    expect(result[0]).toMatchObject({ name: 'Chủ đề d', skill: READING, parts: [7], skipped: 3 });
  });

  it('bằng tỉ lệ thì chủ đề làm nhiều câu hơn lên trước; tối đa 5 chủ đề', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) =>
      row(READING, 5, id, 10 + i, 5 + i, 0),
    );
    const all = new Map(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => [id, topic(id, READING, 5)]));
    const result = weakTopics(
      [row(READING, 5, 'x', 5, 0, 5), row(READING, 5, 'y', 10, 0, 10), ...many],
      new Map([...all, ['x', topic('x', READING, 5)], ['y', topic('y', READING, 5)]]),
    );
    expect(result).toHaveLength(5);
    expect(result.slice(0, 2).map((t) => t.topicId)).toEqual(['y', 'x']);
  });
});

describe('thống kê Speaking/Writing', () => {
  const open = (
    skill: Skill,
    part: number,
    total: number,
    pending: number,
    earned: number,
  ): OpenScopeRow => ({ skill, part, total, pending, earned });

  const rows = [
    open(WRITING, 3, 2, 1, 4), // 1 câu chờ chấm, 1 câu được 4/5
    open(SPEAKING, 2, 2, 0, 3), // 2 câu (1 câu bỏ trống 0 điểm): 3/6
    open(WRITING, 1, 3, 0, 9), // 9/9
  ];

  it('theo kỹ năng: Speaking trước Writing; câu chờ chấm chưa tính vào điểm tối đa', () => {
    expect(openSkillStats(rows)).toEqual([
      { skill: SPEAKING, total: 2, scored: 2, pending: 0, earned: 3, max: 6, percent: 50 },
      // max = 3 câu P1 × 3 + 1 câu P3 đã chấm × 5 = 14
      { skill: WRITING, total: 5, scored: 4, pending: 1, earned: 13, max: 14, percent: 92.9 },
    ]);
  });

  it('theo Part: thứ tự trong đề, điểm trung bình theo thang của dạng câu', () => {
    expect(
      openPartStats(rows).map(({ skill, part, maxScore, average, percent }) => ({
        skill,
        part,
        maxScore,
        average,
        percent,
      })),
    ).toEqual([
      { skill: SPEAKING, part: 2, maxScore: 3, average: 1.5, percent: 50 },
      { skill: WRITING, part: 1, maxScore: 3, average: 3, percent: 100 },
      { skill: WRITING, part: 3, maxScore: 5, average: 4, percent: 80 },
    ]);
  });

  it('chỉ có câu chờ chấm: chưa có điểm', () => {
    expect(openPartStats([open(SPEAKING, 5, 1, 1, 0)])[0]).toMatchObject({
      scored: 0,
      max: 0,
      average: null,
      percent: null,
    });
  });
});
