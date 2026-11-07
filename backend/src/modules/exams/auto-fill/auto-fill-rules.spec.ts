import { describe, expect, it } from 'vitest';
import { Difficulty, ScoringScale, Skill } from '../../../generated/prisma/enums.js';
import {
  DEFAULT_RATIO,
  groupDifficulty,
  pickReading7,
  pickUnits,
  pickWithGraphics,
  planPart,
  READING7_PROFILE,
  READING7_QUESTIONS,
  splitDifficulty,
  subsetWithSize,
  type Candidate,
  type PickOptions,
} from './auto-fill-rules.js';

const { EASY, MEDIUM, HARD } = Difficulty;

/** Ngân hàng giả: n câu mỗi mức độ khó, chủ đề xoay vòng t1, t2, t3 */
function bank(perLevel: number, extra: Partial<Candidate> = {}, prefix = 'q'): Candidate[] {
  return [EASY, MEDIUM, HARD].flatMap((difficulty) =>
    Array.from({ length: perLevel }, (_, i) => ({
      key: `${prefix}-${difficulty}-${i}`,
      difficulty,
      topicId: `t${(i % 3) + 1}`,
      usedCount: 0,
      size: 1,
      hasGraphic: false,
      ...extra,
    })),
  );
}

const options = (overrides: Partial<PickOptions> = {}): PickOptions => ({
  count: 10,
  ratio: DEFAULT_RATIO,
  topics: [],
  preferUnused: false,
  seed: 'seed-1',
  topicName: (id) => id,
  unitLabel: 'câu',
  ...overrides,
});

const levels = (picked: Candidate[]) => ({
  easy: picked.filter((c) => c.difficulty === EASY).length,
  medium: picked.filter((c) => c.difficulty === MEDIUM).length,
  hard: picked.filter((c) => c.difficulty === HARD).length,
});

describe('splitDifficulty, groupDifficulty', () => {
  it('chia theo tỉ lệ, tổng luôn đúng số lượng', () => {
    expect(splitDifficulty(30, DEFAULT_RATIO)).toEqual({ EASY: 9, MEDIUM: 15, HARD: 6 });
    expect(splitDifficulty(6, DEFAULT_RATIO)).toEqual({ EASY: 2, MEDIUM: 3, HARD: 1 });
    expect(splitDifficulty(1, DEFAULT_RATIO)).toEqual({ EASY: 0, MEDIUM: 1, HARD: 0 });
    expect(splitDifficulty(5, { easy: 100, medium: 0, hard: 0 })).toEqual({
      EASY: 5,
      MEDIUM: 0,
      HARD: 0,
    });
  });

  it('độ khó nhóm = trung bình các câu, làm tròn', () => {
    expect(groupDifficulty([EASY, EASY, HARD])).toBe(MEDIUM);
    expect(groupDifficulty([HARD, HARD, MEDIUM])).toBe(HARD);
    expect(groupDifficulty([EASY, EASY, MEDIUM])).toBe(EASY);
  });
});

describe('pickUnits', () => {
  it('đủ số lượng, đúng tỉ lệ độ khó, không trùng, không nới ràng buộc khi ngân hàng đủ', () => {
    const result = pickUnits(bank(20), options({ count: 30 }));
    expect(result.picked).toHaveLength(30);
    expect(new Set(result.picked.map((c) => c.key)).size).toBe(30);
    expect(levels(result.picked)).toEqual({ easy: 9, medium: 15, hard: 6 });
    expect(result.relaxed).toEqual([]);
  });

  it('cùng seed cùng kết quả, seed khác ra bộ câu khác', () => {
    const a = pickUnits(bank(20), options({ seed: 's1' })).picked.map((c) => c.key);
    expect(pickUnits(bank(20), options({ seed: 's1' })).picked.map((c) => c.key)).toEqual(a);
    expect(pickUnits(bank(20), options({ seed: 's2' })).picked.map((c) => c.key)).not.toEqual(a);
  });

  it('đáp ứng số câu tối thiểu theo chủ đề', () => {
    const result = pickUnits(
      bank(20),
      options({
        count: 10,
        topics: [
          { topicId: 't1', min: 6 },
          { topicId: 't2', min: 3 },
        ],
      }),
    );
    const byTopic = (id: string) => result.picked.filter((c) => c.topicId === id).length;
    expect(byTopic('t1')).toBeGreaterThanOrEqual(6);
    expect(byTopic('t2')).toBeGreaterThanOrEqual(3);
    expect(result.picked).toHaveLength(10);
  });

  it('chủ đề không đủ câu: lấy hết những gì có và báo lại', () => {
    const candidates = bank(10).map((c) => ({
      ...c,
      topicId: c.key.endsWith('-0') ? 'hiem' : 't1',
    }));
    const result = pickUnits(
      candidates,
      options({ count: 10, topics: [{ topicId: 'hiem', min: 5 }], topicName: () => 'Từ vựng' }),
    );
    expect(result.picked.filter((c) => c.topicId === 'hiem')).toHaveLength(3);
    expect(result.picked).toHaveLength(10);
    expect(result.relaxed).toContain('Chủ đề "Từ vựng" chỉ có 3/5 câu');
  });

  it('không đủ câu một mức độ khó: lấy câu mức khác và báo lại', () => {
    const candidates = bank(10).filter((c) => c.difficulty !== HARD);
    const result = pickUnits(candidates, options({ count: 10 }));
    expect(result.picked).toHaveLength(10);
    expect(levels(result.picked).hard).toBe(0);
    expect(result.relaxed.some((note) => note.includes('mức Khó'))).toBe(true);
  });

  it('ngân hàng cạn: chọn được bao nhiêu trả bấy nhiêu', () => {
    const result = pickUnits(bank(2), options({ count: 10 }));
    expect(result.picked).toHaveLength(6);
  });

  it('ưu tiên câu chưa dùng ở đề khác; hết câu mới thì lấy câu đã dùng và báo lại', () => {
    const fresh = bank(5, {}, 'new');
    const used = bank(5, { usedCount: 2 }, 'old');
    const enough = pickUnits([...used, ...fresh], options({ count: 10, preferUnused: true }));
    expect(enough.picked.every((c) => c.usedCount === 0)).toBe(true);

    const short = pickUnits(
      [...used, ...fresh.slice(0, 4)],
      options({ count: 10, preferUnused: true }),
    );
    expect(short.picked).toHaveLength(10);
    expect(short.picked.filter((c) => c.usedCount === 0)).toHaveLength(4);
    expect(short.relaxed.some((note) => note.includes('đã dùng ở đề khác'))).toBe(true);
  });
});

describe('pickWithGraphics', () => {
  const groups = (n: number, graphic: boolean, prefix: string) =>
    bank(n, { size: 3, hasGraphic: graphic }, prefix);

  it('Listening 3: đủ 3 nhóm có biểu đồ, đặt ở cuối Part', () => {
    const result = pickWithGraphics(
      [...groups(10, false, 'plain'), ...groups(2, true, 'chart')],
      options({ count: 13, unitLabel: 'nhóm' }),
      3,
    );
    expect(result.picked).toHaveLength(13);
    expect(result.picked.slice(-3).every((c) => c.hasGraphic)).toBe(true);
    expect(result.picked.slice(0, 10).every((c) => !c.hasGraphic)).toBe(true);
  });

  it('thiếu nhóm có biểu đồ: lấy nhóm thường và báo lại', () => {
    const result = pickWithGraphics(
      [...groups(10, false, 'plain'), ...groups(1, true, 'chart').slice(0, 1)],
      options({ count: 13, unitLabel: 'nhóm' }),
      3,
    );
    expect(result.picked).toHaveLength(13);
    expect(result.relaxed).toContain('Chỉ có 1/3 nhóm có biểu đồ');
  });
});

describe('pickReading7', () => {
  /** Nhóm Part 7: mỗi kích thước một số lượng */
  const r7 = (counts: Record<number, number>) =>
    Object.entries(counts).flatMap(([size, n]) =>
      bank(Math.ceil(n / 3), { size: Number(size) }, `s${size}`).slice(0, n),
    );
  const sizes = (picked: Candidate[]) =>
    Object.fromEntries(
      [2, 3, 4, 5].map((size) => [size, picked.filter((c) => c.size === size).length]),
    );
  const r7Options = options({ unitLabel: 'nhóm' });

  it('đủ đúng 54 câu theo hồ sơ 4×2, 3×3, 3×4, 5×5; nhóm nhỏ trước', () => {
    const result = pickReading7(r7({ 2: 10, 3: 10, 4: 10, 5: 10 }), r7Options);
    expect(result.shortage).toBe(0);
    expect(result.picked.reduce((n, c) => n + c.size, 0)).toBe(READING7_QUESTIONS);
    expect(sizes(result.picked)).toEqual(
      Object.fromEntries(READING7_PROFILE.map((bin) => [bin.size, bin.groups])),
    );
    const order = result.picked.map((c) => c.size);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('thiếu nhóm 4 câu: thay bằng các nhóm khác cùng tổng số câu, vẫn đủ 54', () => {
    const result = pickReading7(r7({ 2: 10, 3: 10, 4: 2, 5: 10 }), r7Options);
    expect(result.shortage).toBe(0);
    expect(result.picked.reduce((n, c) => n + c.size, 0)).toBe(54);
    expect(result.relaxed.some((note) => note.includes('cùng tổng 4 câu'))).toBe(true);
  });

  it('ngân hàng không đủ: báo số câu còn thiếu', () => {
    const result = pickReading7(r7({ 2: 4, 3: 3, 4: 3, 5: 3 }), r7Options);
    expect(result.shortage).toBe(10);
  });

  it('subsetWithSize tìm tổ hợp đúng tổng', () => {
    const items = [{ size: 5 }, { size: 3 }, { size: 2 }, { size: 2 }];
    expect(subsetWithSize(items, 4)?.map((i) => i.size)).toEqual([2, 2]);
    expect(subsetWithSize(items, 1)).toBeNull();
  });
});

describe('planPart', () => {
  it('đề TOEIC: số lượng chuẩn, Part nhóm tính theo số nhóm', () => {
    expect(planPart(ScoringScale.TOEIC_990, Skill.READING, 5)).toMatchObject({
      unit: 'QUESTION',
      count: 30,
    });
    expect(planPart(ScoringScale.TOEIC_990, Skill.LISTENING, 3)).toMatchObject({
      unit: 'GROUP',
      count: 13,
      questions: 39,
      graphics: 3,
    });
    expect(planPart(ScoringScale.TOEIC_990, Skill.LISTENING, 4)).toMatchObject({ graphics: 2 });
    expect(planPart(ScoringScale.TOEIC_990, Skill.READING, 6)).toMatchObject({ count: 4 });
    expect(planPart(ScoringScale.TOEIC_990, Skill.READING, 7)).toMatchObject({
      reading7Profile: true,
      questions: 54,
    });
    expect(planPart(ScoringScale.TOEIC_SW, Skill.SPEAKING, 4)).toMatchObject({
      unit: 'GROUP',
      count: 1,
    });
  });

  it('đề PERCENT: số lượng do giáo viên nhập; thiếu số lượng thì không rút', () => {
    expect(planPart(ScoringScale.PERCENT, Skill.READING, 5, 20)).toMatchObject({ count: 20 });
    expect(planPart(ScoringScale.PERCENT, Skill.READING, 7, 5)).toMatchObject({
      unit: 'GROUP',
      count: 5,
      reading7Profile: false,
    });
    expect(planPart(ScoringScale.PERCENT, Skill.READING, 5)).toBeNull();
    expect(planPart(ScoringScale.TOEIC_990, Skill.READING, 9)).toBeNull();
  });
});
