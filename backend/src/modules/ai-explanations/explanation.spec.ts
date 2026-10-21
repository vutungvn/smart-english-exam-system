import { describe, expect, it } from 'vitest';
import { Skill } from '../../generated/prisma/enums.js';
import {
  contentHashOf,
  explanationPrompt,
  explanationSchema,
  fakeExplanation,
  type ExplainSource,
} from './explanation.js';

const source = (overrides: Partial<ExplainSource> = {}): ExplainSource => ({
  skill: Skill.READING,
  part: 5,
  content: 'The manager asked all staff to ------- the meeting.',
  explanation: null,
  imageKey: null,
  options: [
    { label: 'A', content: 'attend', isCorrect: true },
    { label: 'B', content: 'attends', isCorrect: false },
    { label: 'C', content: 'attending', isCorrect: false },
    { label: 'D', content: 'attended', isCorrect: false },
  ],
  group: null,
  ...overrides,
});

const LABELS = ['A', 'B', 'C', 'D'];
const valid = {
  summary: 'Sau "ask somebody to" dùng động từ nguyên mẫu.',
  options: LABELS.map((label) => ({ label, reason: 'lý do' })),
  keyPoints: [],
  tip: '',
};

describe('contentHashOf', () => {
  it('cùng nội dung thì cùng mã băm', () => {
    expect(contentHashOf(source())).toBe(contentHashOf(source()));
  });

  it('đổi phương án, đáp án đúng hoặc lời thoại thì mã băm đổi', () => {
    const base = contentHashOf(source());
    const edited = source().options.map((option) =>
      option.label === 'B' ? { ...option, content: 'attendance' } : option,
    );
    expect(contentHashOf(source({ options: edited }))).not.toBe(base);

    const moved = source().options.map((option) => ({
      ...option,
      isCorrect: option.label === 'B',
    }));
    expect(contentHashOf(source({ options: moved }))).not.toBe(base);

    const group = { passage: null, transcript: 'W: Hello.', imageKey: null };
    expect(contentHashOf(source({ group }))).not.toBe(
      contentHashOf(source({ group: { ...group, transcript: 'W: Hi.' } })),
    );
  });
});

describe('explanationSchema', () => {
  const schema = explanationSchema(LABELS);

  it('nhận kết quả đủ mỗi phương án một mục', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('từ chối thiếu phương án, nhãn lạ, nhãn trùng', () => {
    expect(schema.safeParse({ ...valid, options: valid.options.slice(0, 3) }).success).toBe(false);
    const strange = valid.options.map((o, i) => (i === 3 ? { ...o, label: 'E' } : o));
    expect(schema.safeParse({ ...valid, options: strange }).success).toBe(false);
    const duplicated = valid.options.map((o, i) => (i === 3 ? { ...o, label: 'A' } : o));
    expect(schema.safeParse({ ...valid, options: duplicated }).success).toBe(false);
  });

  it('Part 2 chỉ có A–C', () => {
    const part2 = explanationSchema(['A', 'B', 'C']);
    expect(part2.safeParse(valid).success).toBe(false);
    expect(part2.safeParse({ ...valid, options: valid.options.slice(0, 3) }).success).toBe(true);
  });

  it('kết quả mẫu (FakeAiProvider) đúng cấu trúc', () => {
    expect(schema.safeParse(fakeExplanation(source())).success).toBe(true);
  });
});

describe('explanationPrompt', () => {
  it('có dạng câu, phương án và đáp án đúng; không có ghi chú giáo viên khi để trống', () => {
    const prompt = explanationPrompt(source(), false);
    expect(prompt).toContain('Reading Part 5');
    expect(prompt).toContain('A. attend');
    expect(prompt).toContain('Correct answer: A');
    expect(prompt).not.toContain("Teacher's note");
  });

  it('câu Listening theo nhóm có lời thoại', () => {
    const prompt = explanationPrompt(
      source({
        skill: Skill.LISTENING,
        part: 3,
        group: { passage: null, transcript: 'M: Where is the meeting?', imageKey: null },
      }),
      false,
    );
    expect(prompt).toContain('Audio transcript:');
    expect(prompt).toContain('M: Where is the meeting?');
  });
});
