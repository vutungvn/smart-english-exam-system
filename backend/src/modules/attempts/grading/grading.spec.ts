import { describe, expect, it } from 'vitest';
import { AttemptMode, QuestionType, ScoringScale, Skill } from '../../../generated/prisma/enums.js';
import {
  gradeAttempt,
  percentStrategy,
  strategyFor,
  toeic990Strategy,
  type GradingAnswer,
  type GradingQuestion,
} from './grading.js';
import { TOEIC_LR_TABLE, toeicLrScore } from './toeic-conversion.js';

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

describe('Chọn cách quy đổi', () => {
  it('làm cả đề TOEIC_990 → TOEIC 990; luyện theo Part và đề PERCENT → %', () => {
    expect(strategyFor(ScoringScale.TOEIC_990, AttemptMode.FULL)).toBe(toeic990Strategy);
    expect(strategyFor(ScoringScale.TOEIC_990, AttemptMode.PART)).toBe(percentStrategy);
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
