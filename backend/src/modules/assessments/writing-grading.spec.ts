import { describe, expect, it } from 'vitest';
import { AttemptStatus, Skill } from '../../generated/prisma/enums.js';
import { normalizeSkills } from './attempt-scoring.service.js';
import {
  countWords,
  FAKE_FAIL_MARKER,
  FAKE_FAIL_TRIES,
  fakeWritingResult,
  writingPrompt,
  writingResultSchema,
  writingRubric,
} from './writing-grading.js';

const valid = {
  score: 3,
  criteria: { grammar: 4, vocabulary: 3, coherence: 4, task: 5 },
  feedback: 'Câu đúng ngữ pháp, dùng đủ hai từ.',
  corrections: [],
  improvedAnswer: 'A man is riding a bicycle.',
};

describe('Kiểm tra kết quả AI chấm Writing', () => {
  it('nhận kết quả đúng thang của dạng câu', () => {
    expect(writingResultSchema(3).safeParse(valid).success).toBe(true);
  });

  it('điểm ngoài thang, số lẻ hoặc tiêu chí ngoài 0–5 bị coi là sai cấu trúc (gọi lại AI)', () => {
    const schema = writingResultSchema(3);
    expect(schema.safeParse({ ...valid, score: 4 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, score: -1 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, score: 2.5 }).success).toBe(false);
    expect(
      schema.safeParse({ ...valid, criteria: { ...valid.criteria, grammar: 6 } }).success,
    ).toBe(false);
  });

  it('thiếu nhận xét hoặc thiếu tiêu chí cũng bị loại', () => {
    const schema = writingResultSchema(5);
    expect(schema.safeParse({ ...valid, feedback: '  ' }).success).toBe(false);
    expect(schema.safeParse({ ...valid, criteria: { grammar: 3 } }).success).toBe(false);
  });
});

describe('Rubric và prompt', () => {
  it('thang điểm 3 dạng câu: Part 1 0–3, Part 2 0–4, Part 3 0–5; mỗi mức có mô tả', () => {
    expect([1, 2, 3].map((part) => writingRubric(part).maxScore)).toEqual([3, 4, 5]);
    for (const part of [1, 2, 3]) {
      expect(writingRubric(part).levels).toHaveLength(writingRubric(part).maxScore + 1);
    }
  });

  it('prompt có rubric, đề bài, số từ và bài làm; không có thông tin định danh nào được truyền vào', () => {
    const prompt = writingPrompt({
      part: 1,
      content: 'Words: man / bicycle',
      sampleAnswer: 'A man is riding his bicycle.',
      answer: 'The man ride bicycle',
      hasImage: true,
    });
    expect(prompt).toContain('TOEIC Writing Part 1');
    expect(prompt).toContain('3: one sentence');
    expect(prompt).toContain('Words: man / bicycle');
    expect(prompt).toContain('(4 words)');
    expect(prompt).toContain('The man ride bicycle');
    expect(prompt).toContain('picture of the question is attached');
  });

  it('đếm số từ bỏ qua khoảng trắng thừa', () => {
    expect(countWords('  Hello   world \n again ')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });
});

describe('Kết quả mẫu của FakeAiProvider', () => {
  it('điểm tăng theo độ dài bài, không vượt thang và qua được bước kiểm tra', () => {
    const short = fakeWritingResult(3, 'I agree.', 1);
    const long = fakeWritingResult(3, 'word '.repeat(300), 1);
    expect(writingResultSchema(5).safeParse(short).success).toBe(true);
    expect(writingResultSchema(5).safeParse(long).success).toBe(true);
    expect(long.score).toBe(5);
    expect(short.score).toBeLessThan(long.score);
  });

  it(`bài có từ khóa ${FAKE_FAIL_MARKER}: lỗi ${FAKE_FAIL_TRIES} lần đầu, lần chấm lại thì được`, () => {
    const schema = writingResultSchema(3);
    const answer = `A man is riding a bicycle ${FAKE_FAIL_MARKER}`;
    for (let tries = 1; tries <= FAKE_FAIL_TRIES; tries++) {
      expect(schema.safeParse(fakeWritingResult(1, answer, tries)).success).toBe(false);
    }
    expect(schema.safeParse(fakeWritingResult(1, answer, FAKE_FAIL_TRIES + 1)).success).toBe(true);
  });
});

describe('normalizeSkills', () => {
  it('bài nộp trước SPRINT-86 thiếu trường câu mở: còn chờ chấm thì coi mọi câu mở là chưa có điểm', () => {
    const old = [
      {
        skill: Skill.WRITING,
        correct: 0,
        wrong: 0,
        skipped: 0,
        total: 0,
        openCount: 8,
        scaled: null,
      },
    ];
    expect(normalizeSkills(old, AttemptStatus.SUBMITTED)[0]).toMatchObject({
      openMax: 0,
      openRaw: null,
      openPending: 8,
    });
  });

  it('bài LR cũ không có câu mở: điểm câu mở 0, không chờ chấm', () => {
    const old = [
      {
        skill: Skill.READING,
        correct: 5,
        wrong: 1,
        skipped: 0,
        total: 6,
        openCount: 0,
        scaled: 30,
      },
    ];
    expect(normalizeSkills(old, AttemptStatus.GRADED)[0]).toMatchObject({
      openRaw: 0,
      openPending: 0,
      scaled: 30,
    });
  });
});
