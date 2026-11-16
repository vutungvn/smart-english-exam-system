import { describe, expect, it } from 'vitest';
import { seededOrder, shuffleSections } from './paper-shuffle.js';

const single = (id: string) => ({ id, question: { group: null } });
const grouped = (id: string, groupId: string) => ({ id, question: { group: { id: groupId } } });

/** Part 5 có 10 câu đơn; Part 7 có 4 nhóm (2, 3, 2, 3 câu) */
const SECTIONS = [
  { id: 'R5', questions: Array.from({ length: 10 }, (_, i) => single(`q${i + 1}`)) },
  {
    id: 'R7',
    questions: [
      grouped('g1a', 'g1'),
      grouped('g1b', 'g1'),
      grouped('g2a', 'g2'),
      grouped('g2b', 'g2'),
      grouped('g2c', 'g2'),
      grouped('g3a', 'g3'),
      grouped('g3b', 'g3'),
      grouped('g4a', 'g4'),
      grouped('g4b', 'g4'),
      grouped('g4c', 'g4'),
    ],
  },
];

const ids = (sections: typeof SECTIONS) => sections.map((s) => s.questions.map((q) => q.id));

describe('seededOrder', () => {
  const items = Array.from({ length: 20 }, (_, i) => `item-${i}`);
  const order = (seed: string) => seededOrder(items, seed, (item) => item);

  it('cùng seed luôn ra cùng thứ tự, seed khác ra thứ tự khác', () => {
    expect(order('attempt-1')).toEqual(order('attempt-1'));
    expect(order('attempt-1')).not.toEqual(order('attempt-2'));
    expect([...order('attempt-1')].sort()).toEqual([...items].sort());
  });

  it('không phụ thuộc thứ tự đầu vào: các phần tử còn lại giữ thứ tự tương đối khi bớt một phần tử', () => {
    const full = order('attempt-1');
    const without = seededOrder(
      items.filter((item) => item !== 'item-7'),
      'attempt-1',
      (item) => item,
    );
    expect(without).toEqual(full.filter((item) => item !== 'item-7'));
    expect(seededOrder([...items].reverse(), 'attempt-1', (item) => item)).toEqual(full);
  });

  it('phân bố gần đều: mỗi phần tử đứng đầu với tần suất xấp xỉ nhau', () => {
    const firsts = new Map<string, number>();
    const small = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 4000; i++) {
      const [first] = seededOrder(small, `seed-${i}`, (item) => item);
      firsts.set(first, (firsts.get(first) ?? 0) + 1);
    }
    // Kỳ vọng 1000 lần mỗi phần tử; cho sai số ±15%
    for (const item of small) expect(firsts.get(item)).toBeGreaterThan(850);
    for (const item of small) expect(firsts.get(item)).toBeLessThan(1150);
  });
});

describe('shuffleSections', () => {
  it('đảo câu trong Part; Part giữ thứ tự; cùng lượt làm bài thì cùng thứ tự', () => {
    const a = shuffleSections(SECTIONS, 'attempt-a');
    expect(a.map((s) => s.id)).toEqual(['R5', 'R7']);
    expect(ids(a)).toEqual(ids(shuffleSections(SECTIONS, 'attempt-a')));
    expect(ids(a)).not.toEqual(ids(shuffleSections(SECTIONS, 'attempt-b')));
    expect([...a[0].questions.map((q) => q.id)].sort()).toEqual(
      [...SECTIONS[0].questions.map((q) => q.id)].sort(),
    );
  });

  it('nhóm câu không bị tách và giữ thứ tự câu bên trong nhóm', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const order = shuffleSections(SECTIONS, seed)[1].questions.map((q) => q.id);
      for (const group of [
        ['g1a', 'g1b'],
        ['g2a', 'g2b', 'g2c'],
        ['g3a', 'g3b'],
        ['g4a', 'g4b', 'g4c'],
      ]) {
        const start = order.indexOf(group[0]);
        expect(order.slice(start, start + group.length)).toEqual(group);
      }
    }
  });

  it('không sửa đề gốc (đề trong cache dùng chung cho mọi học viên)', () => {
    const before = JSON.stringify(SECTIONS);
    shuffleSections(SECTIONS, 'attempt-a');
    expect(JSON.stringify(SECTIONS)).toBe(before);
  });
});
