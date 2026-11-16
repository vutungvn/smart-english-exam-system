import { describe, expect, it } from 'vitest';
import { AttemptMode, QuestionType, ScoringScale, Skill } from '../../../generated/prisma/enums.js';
import {
  gradeAttempt,
  percentStrategy,
  strategyFor,
  toeic990Strategy,
  toeicSwStrategy,
  type GradingAnswer,
  type GradingQuestion,
} from './grading.js';
import { TOEIC_LR_TABLE, toeicLrScore } from './toeic-conversion.js';
import { openMaxScore, toeicSwScore } from './toeic-sw-conversion.js';

const choice = (id: string, skill: Skill = Skill.READING): GradingQuestion => ({
  examQuestionId: id,
  skill,
  type: QuestionType.SINGLE_CHOICE,
  correctOptionId: `${id}-ok`,
});
const open = (id: string, skill: Skill, type: QuestionType): GradingQuestion => ({
  examQuestionId: id,
  skill,
  type,
  correctOptionId: null,
});
/** Câu Writing đã có điểm (null: chờ chấm) */
const writing = (id: string, part: number, openScore: number | null): GradingQuestion => ({
  ...open(id, Skill.WRITING, QuestionType.WRITTEN_RESPONSE),
  maxScore: openMaxScore(Skill.WRITING, part),
  openScore,
});
/** Đề Writing chuẩn: 5 câu P1 (0–3), 2 câu P2 (0–4), 1 câu P3 (0–5) = 28 điểm thô */
function writingTest(p1: number, p2: number, p3: number | null): GradingQuestion[] {
  return [
    ...Array.from({ length: 5 }, (_, i) => writing(`w1-${i}`, 1, p1)),
    writing('w2-1', 2, p2),
    writing('w2-2', 2, p2),
    writing('w3', 3, p3),
  ];
}
const right = (id: string): GradingAnswer => ({ examQuestionId: id, selectedOptionId: `${id}-ok` });
const wrong = (id: string): GradingAnswer => ({ examQuestionId: id, selectedOptionId: `${id}-x` });

/** n câu một kỹ năng, k câu đầu trả lời đúng, còn lại bỏ trống */
function lrSkill(skill: Skill, n: number, k: number) {
  const prefix = skill === Skill.LISTENING ? 'L' : 'R';
  const questions = Array.from({ length: n }, (_, i) => choice(`${prefix}${i}`, skill));
  const answers = questions.slice(0, k).map((q) => right(q.examQuestionId));
  return { questions, answers };
}

describe('Bảng quy đổi TOEIC LR', () => {
  it.each([Skill.LISTENING, Skill.READING])('%s: 0 câu → 5 điểm, 100 câu → 495 điểm', (skill) => {
    expect(toeicLrScore(skill, 0)).toBe(5);
    expect(toeicLrScore(skill, 100)).toBe(495);
  });

  it.each([Skill.LISTENING, Skill.READING])(
    '%s: đủ 101 mức, không giảm khi đúng thêm, luôn là bội số của 5 trong khoảng 5–495',
    (skill) => {
      const table = TOEIC_LR_TABLE[skill];
      expect(table).toHaveLength(101);
      table.forEach((score, i) => {
        expect(score % 5).toBe(0);
        expect(score).toBeGreaterThanOrEqual(5);
        expect(score).toBeLessThanOrEqual(495);
        if (i > 0) expect(score).toBeGreaterThanOrEqual(table[i - 1]);
      });
    },
  );

  it('Listening cùng số câu đúng được điểm không thấp hơn Reading (như các bảng tham khảo)', () => {
    expect(toeicLrScore(Skill.LISTENING, 50)).toBe(250);
    expect(toeicLrScore(Skill.READING, 50)).toBe(220);
  });

  it('ép số câu ngoài 0–100 vào khoảng; kỹ năng khác LR không quy đổi', () => {
    expect(toeicLrScore(Skill.READING, -3)).toBe(5);
    expect(toeicLrScore(Skill.READING, 120)).toBe(495);
    expect(toeicLrScore(Skill.WRITING, 5)).toBeNull();
  });
});

describe('Bảng quy đổi TOEIC SW', () => {
  it.each([Skill.SPEAKING, Skill.WRITING])('%s: 0 điểm thô → 0, tối đa → 200', (skill) => {
    expect(toeicSwScore(skill, 0, 28)).toBe(0);
    expect(toeicSwScore(skill, 28, 28)).toBe(200);
  });

  it.each([Skill.SPEAKING, Skill.WRITING])(
    '%s: luôn là bội số của 10 trong 0–200, không giảm khi điểm thô tăng',
    (skill) => {
      let previous = -1;
      for (let raw = 0; raw <= 41; raw++) {
        const score = toeicSwScore(skill, raw, 41) as number;
        expect(score % 10).toBe(0);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(200);
        expect(score).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
    },
  );

  it('tính theo tỉ lệ: một nửa điểm thô Writing → 110; ép điểm ngoài khoảng', () => {
    expect(toeicSwScore(Skill.WRITING, 14, 28)).toBe(110);
    expect(toeicSwScore(Skill.WRITING, 40, 28)).toBe(200);
    expect(toeicSwScore(Skill.WRITING, -1, 28)).toBe(0);
  });

  it('kỹ năng LR hoặc điểm tối đa 0 không quy đổi', () => {
    expect(toeicSwScore(Skill.READING, 5, 10)).toBeNull();
    expect(toeicSwScore(Skill.WRITING, 0, 0)).toBeNull();
  });

  it('thang điểm từng dạng câu theo ETS: Writing 3/4/5, Speaking Part 1 = 6 (hai tiêu chí)', () => {
    expect([1, 2, 3].map((part) => openMaxScore(Skill.WRITING, part))).toEqual([3, 4, 5]);
    expect([1, 2, 3, 4, 5].map((part) => openMaxScore(Skill.SPEAKING, part))).toEqual([
      6, 3, 3, 3, 5,
    ]);
    expect(openMaxScore(Skill.READING, 5)).toBe(0);
  });
});

describe('Chọn cách quy đổi', () => {
  it('làm cả đề TOEIC_990 → TOEIC 990; TOEIC_SW → 0–200; luyện theo Part và đề PERCENT → %', () => {
    expect(strategyFor(ScoringScale.TOEIC_990, AttemptMode.FULL)).toBe(toeic990Strategy);
    expect(strategyFor(ScoringScale.TOEIC_SW, AttemptMode.FULL)).toBe(toeicSwStrategy);
    expect(strategyFor(ScoringScale.TOEIC_990, AttemptMode.PART)).toBe(percentStrategy);
    expect(strategyFor(ScoringScale.TOEIC_SW, AttemptMode.PART)).toBe(percentStrategy);
    expect(strategyFor(ScoringScale.PERCENT, AttemptMode.FULL)).toBe(percentStrategy);
  });
});

describe('gradeAttempt', () => {
  it('đếm đúng / sai / bỏ trống và đánh dấu từng câu', () => {
    const result = gradeAttempt({
      scale: ScoringScale.PERCENT,
      mode: AttemptMode.FULL,
      questions: [choice('q1'), choice('q2'), choice('q3')],
      // q3 chỉ được đánh dấu (selectedOptionId null) nên tính là bỏ trống
      answers: [right('q1'), wrong('q2'), { examQuestionId: 'q3', selectedOptionId: null }],
    });
    expect(result).toMatchObject({ correct: 1, wrong: 1, skipped: 1, rawScore: 1, pendingOpen: 0 });
    expect(result.scaledScore).toBe(33.33);
    expect(result.marks.get('q1')).toBe(true);
    expect(result.marks.get('q2')).toBe(false);
    expect(result.marks.has('q3')).toBe(false);
  });

  it('không trả lời câu nào → 0 điểm, mọi câu bỏ trống', () => {
    const result = gradeAttempt({
      scale: ScoringScale.PERCENT,
      mode: AttemptMode.FULL,
      questions: [choice('q1'), choice('q2')],
      answers: [],
    });
    expect(result).toMatchObject({ correct: 0, wrong: 0, skipped: 2, scaledScore: 0 });
  });

  it('đề TOEIC LR làm cả đề: quy đổi từng kỹ năng theo bảng rồi cộng lại', () => {
    const listening = lrSkill(Skill.LISTENING, 100, 50);
    const reading = lrSkill(Skill.READING, 100, 100);
    const result = gradeAttempt({
      scale: ScoringScale.TOEIC_990,
      mode: AttemptMode.FULL,
      questions: [...listening.questions, ...reading.questions],
      answers: [...listening.answers, ...reading.answers],
    });
    expect(result.strategy).toBe('TOEIC_990');
    expect(result.skills.map((s) => [s.skill, s.correct, s.scaled])).toEqual([
      [Skill.LISTENING, 50, 250],
      [Skill.READING, 100, 495],
    ]);
    expect(result.scaledScore).toBe(745);
    expect(result.rawScore).toBe(150);
  });

  it('đề TOEIC LR làm trọn đúng hết → 990, sai hết → 10', () => {
    const all = (k: number) => {
      const l = lrSkill(Skill.LISTENING, 100, k);
      const r = lrSkill(Skill.READING, 100, k);
      return gradeAttempt({
        scale: ScoringScale.TOEIC_990,
        mode: AttemptMode.FULL,
        questions: [...l.questions, ...r.questions],
        answers: [...l.answers, ...r.answers],
      }).scaledScore;
    };
    expect(all(100)).toBe(990);
    expect(all(0)).toBe(10);
  });

  it('luyện một Part của đề TOEIC LR → tính %', () => {
    const part = lrSkill(Skill.READING, 4, 3);
    const result = gradeAttempt({
      scale: ScoringScale.TOEIC_990,
      mode: AttemptMode.PART,
      ...part,
    });
    expect(result.strategy).toBe('PERCENT');
    expect(result.scaledScore).toBe(75);
    expect(result.skills[0].scaled).toBe(75);
  });

  it('đề có câu Speaking/Writing: chấm phần trắc nghiệm, điểm tổng chờ AI chấm', () => {
    const result = gradeAttempt({
      scale: ScoringScale.PERCENT,
      mode: AttemptMode.FULL,
      questions: [
        choice('q1'),
        choice('q2'),
        open('s1', Skill.SPEAKING, QuestionType.SPOKEN_RESPONSE),
        open('w1', Skill.WRITING, QuestionType.WRITTEN_RESPONSE),
      ],
      answers: [right('q1'), right('q2')],
    });
    expect(result).toMatchObject({ correct: 2, pendingOpen: 2, scaledScore: null });
    expect(result.skills.find((s) => s.skill === Skill.READING)?.scaled).toBe(100);
    expect(result.skills.find((s) => s.skill === Skill.WRITING)).toMatchObject({
      openCount: 1,
      total: 0,
      scaled: null,
    });
  });

  it('đề Speaking/Writing (TOEIC_SW) chỉ có câu mở → không có điểm trắc nghiệm, chờ AI', () => {
    const result = gradeAttempt({
      scale: ScoringScale.TOEIC_SW,
      mode: AttemptMode.FULL,
      questions: [open('w1', Skill.WRITING, QuestionType.WRITTEN_RESPONSE)],
      answers: [],
    });
    expect(result).toMatchObject({
      correct: 0,
      wrong: 0,
      skipped: 0,
      pendingOpen: 1,
      scaledScore: null,
    });
  });

  it('đề Writing làm cả đề đã chấm xong: cộng điểm thô /28 rồi quy đổi 0–200', () => {
    // 5×2 + 2×3 + 4 = 20/28 ≈ 71% → 140 + (71,4 − 65) × 2 ≈ 152,9 → 150
    const result = gradeAttempt({
      scale: ScoringScale.TOEIC_SW,
      mode: AttemptMode.FULL,
      questions: writingTest(2, 3, 4),
      answers: [],
    });
    expect(result).toMatchObject({ strategy: 'TOEIC_SW', pendingOpen: 0, scaledScore: 150 });
    expect(result.skills[0]).toMatchObject({
      skill: Skill.WRITING,
      openCount: 8,
      openMax: 28,
      openRaw: 20,
      openPending: 0,
      scaled: 150,
    });
  });

  it('đề Writing còn câu chờ chấm: chưa có điểm, đếm số câu chờ', () => {
    const result = gradeAttempt({
      scale: ScoringScale.TOEIC_SW,
      mode: AttemptMode.FULL,
      questions: writingTest(3, 4, null),
      answers: [],
    });
    expect(result).toMatchObject({ pendingOpen: 1, scaledScore: null });
    expect(result.skills[0]).toMatchObject({ openRaw: null, openPending: 1, scaled: null });
  });

  it('đề Writing bỏ trống hết (mọi câu 0 điểm) → có điểm 0 ngay, không chờ AI', () => {
    const result = gradeAttempt({
      scale: ScoringScale.TOEIC_SW,
      mode: AttemptMode.FULL,
      questions: writingTest(0, 0, 0),
      answers: [],
    });
    expect(result).toMatchObject({ pendingOpen: 0, scaledScore: 0 });
  });

  it('luyện một Part Writing → % điểm đạt trên điểm tối đa', () => {
    const result = gradeAttempt({
      scale: ScoringScale.TOEIC_SW,
      mode: AttemptMode.PART,
      questions: [writing('a', 2, 3), writing('b', 2, 2)],
      answers: [],
    });
    expect(result).toMatchObject({ strategy: 'PERCENT', scaledScore: 62.5 });
  });

  it('đề PERCENT có cả trắc nghiệm và Writing: câu trắc nghiệm 1 điểm, câu mở theo thang', () => {
    const result = gradeAttempt({
      scale: ScoringScale.PERCENT,
      mode: AttemptMode.FULL,
      questions: [choice('q1'), choice('q2'), writing('w', 3, 4)],
      answers: [right('q1'), wrong('q2')],
    });
    // (1 + 4) / (2 + 5)
    expect(result.scaledScore).toBe(71.43);
  });

  it('câu MULTIPLE_CHOICE chấm như câu chọn một đáp án; câu không có đáp án đúng thì chọn gì cũng sai', () => {
    const result = gradeAttempt({
      scale: ScoringScale.PERCENT,
      mode: AttemptMode.FULL,
      questions: [
        { ...choice('m1'), type: QuestionType.MULTIPLE_CHOICE },
        { ...choice('broken'), correctOptionId: null },
      ],
      answers: [right('m1'), right('broken')],
    });
    expect(result).toMatchObject({ correct: 1, wrong: 1, scaledScore: 50 });
  });

  it('bỏ qua câu trả lời của câu không thuộc phạm vi bài làm', () => {
    const result = gradeAttempt({
      scale: ScoringScale.PERCENT,
      mode: AttemptMode.PART,
      questions: [choice('q1')],
      answers: [right('q1'), right('other')],
    });
    expect(result).toMatchObject({ correct: 1, wrong: 0, skipped: 0, scaledScore: 100 });
  });
});
