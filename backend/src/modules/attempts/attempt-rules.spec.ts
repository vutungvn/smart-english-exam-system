import { describe, expect, it } from 'vitest';
import { AttemptMode, QuestionType } from '../../generated/prisma/enums.js';
import {
  answerProblem,
  answerWrite,
  clampAnsweredAt,
  expiresAtFor,
  mergeAnswer,
  remainingSeconds,
  withinDeadline,
  type AnswerInput,
  type AnswerValues,
  type AnswerWrite,
} from './attempt-rules.js';

/** Làm đúng như vế DO UPDATE SET … CASE WHEN … của câu SQL trong AttemptsService.upsertAnswer */
function applyWrite(
  existing: AnswerValues | null,
  { values, overwrite }: AnswerWrite,
): AnswerValues {
  if (!existing) return values;
  return {
    selectedOptionId: overwrite.selectedOptionId
      ? values.selectedOptionId
      : existing.selectedOptionId,
    textAnswer: overwrite.textAnswer ? values.textAnswer : existing.textAnswer,
    isFlagged: overwrite.isFlagged ? values.isFlagged : existing.isFlagged,
  };
}

const EXISTING: (AnswerValues | null)[] = [
  null,
  { selectedOptionId: 'opt-a', textAnswer: null, isFlagged: true },
  { selectedOptionId: null, textAnswer: 'Bài viết cũ', isFlagged: false },
];

// Mọi tổ hợp: không gửi / gửi giá trị / gửi null (xóa) / gửi chuỗi rỗng
const INPUTS: AnswerInput[] = [];
for (const selectedOptionId of [undefined, 'opt-b', null]) {
  for (const textAnswer of [undefined, 'Bài viết mới', '', null]) {
    for (const isFlagged of [undefined, true, false]) {
      INPUTS.push({ selectedOptionId, textAnswer, isFlagged });
    }
  }
}

describe('answerWrite', () => {
  it('ghi bằng một câu SQL cho cùng kết quả với đọc bản cũ rồi ghép (mergeAnswer)', () => {
    for (const existing of EXISTING) {
      for (const input of INPUTS) {
        expect(
          applyWrite(existing, answerWrite(input)),
          JSON.stringify({ existing, input }),
        ).toEqual(mergeAnswer(existing, input));
      }
    }
  });

  it('chỉ đánh dấu câu thì giữ nguyên phương án đã chọn', () => {
    const write = answerWrite({ isFlagged: true });
    expect(write.overwrite).toEqual({
      selectedOptionId: false,
      textAnswer: false,
      isFlagged: true,
    });
    expect(applyWrite(EXISTING[1], write)).toEqual({
      selectedOptionId: 'opt-a',
      textAnswer: null,
      isFlagged: true,
    });
  });

  it('gửi chuỗi rỗng là xóa bài viết', () => {
    expect(applyWrite(EXISTING[2], answerWrite({ textAnswer: '' })).textAnswer).toBeNull();
  });
});

describe('Đồng hồ làm bài', () => {
  const NOW = new Date('2026-11-05T08:00:00.000Z');
  const at = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

  it('làm cả đề hết giờ sau durationMinutes; luyện theo Part không đếm giờ', () => {
    expect(expiresAtFor(AttemptMode.FULL, 120, NOW)).toEqual(at(120 * 60));
    expect(expiresAtFor(AttemptMode.PART, 120, NOW)).toBeNull();
  });

  it('thời gian còn lại làm tròn xuống, không âm; null khi không đếm giờ', () => {
    expect(remainingSeconds(at(90.9), NOW)).toBe(90);
    expect(remainingSeconds(at(-30), NOW)).toBe(0);
    expect(remainingSeconds(null, NOW)).toBeNull();
  });

  it('hạn nhận câu trả lời tính cả thời gian ân hạn; không đếm giờ thì luôn nhận', () => {
    const expiresAt = NOW;
    expect(withinDeadline(expiresAt, at(15), 15)).toBe(true);
    expect(withinDeadline(expiresAt, at(16), 15)).toBe(false);
    expect(withinDeadline(expiresAt, at(120), 120)).toBe(true);
    expect(withinDeadline(null, at(999_999), 0)).toBe(true);
  });

  it('thời điểm trả lời do client gửi bị ép về [lúc bắt đầu, bây giờ]', () => {
    const startedAt = at(-600);
    expect(clampAnsweredAt(at(-60).toISOString(), startedAt, NOW)).toEqual(at(-60));
    // Đồng hồ máy học viên chạy nhanh: không được ghi sau thời điểm hiện tại của server
    expect(clampAnsweredAt(at(3600).toISOString(), startedAt, NOW)).toEqual(NOW);
    // Đồng hồ chạy chậm: không sớm hơn lúc bắt đầu làm bài
    expect(clampAnsweredAt(at(-7200).toISOString(), startedAt, NOW)).toEqual(startedAt);
    expect(clampAnsweredAt(undefined, startedAt, NOW)).toEqual(NOW);
  });
});

describe('answerProblem', () => {
  const choice = { type: QuestionType.SINGLE_CHOICE, optionIds: new Set(['opt-a', 'opt-b']) };

  it('phải gửi ít nhất một trường', () => {
    expect(answerProblem(choice, {})?.field).toBe('selectedOptionId');
  });

  it('câu trắc nghiệm: chỉ nhận phương án của chính câu đó, không nhận bài viết', () => {
    expect(answerProblem(choice, { selectedOptionId: 'opt-a' })).toBeNull();
    expect(answerProblem(choice, { selectedOptionId: null })).toBeNull();
    expect(answerProblem(choice, { isFlagged: true })).toBeNull();
    expect(answerProblem(choice, { selectedOptionId: 'opt-x' })?.field).toBe('selectedOptionId');
    expect(answerProblem(choice, { textAnswer: 'abc' })?.field).toBe('textAnswer');
  });

  it('câu Writing không có phương án; câu Speaking không nhận phương án lẫn bài viết', () => {
    const writing = { type: QuestionType.WRITTEN_RESPONSE, optionIds: new Set<string>() };
    const speaking = { type: QuestionType.SPOKEN_RESPONSE, optionIds: new Set<string>() };
    expect(answerProblem(writing, { textAnswer: 'My answer' })).toBeNull();
    expect(answerProblem(writing, { selectedOptionId: 'opt-a' })?.field).toBe('selectedOptionId');
    expect(answerProblem(speaking, { isFlagged: true })).toBeNull();
    expect(answerProblem(speaking, { textAnswer: 'x' })?.field).toBe('textAnswer');
  });
});
