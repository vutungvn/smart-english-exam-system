import { describe, expect, it } from 'vitest';
import { QuestionType } from '../../generated/prisma/enums.js';
import { ReviewOutcome } from './attempts.types.js';
import { addOutcome, durationOf, emptyCounts, reviewOutcome } from './review-outcome.js';

const { SINGLE_CHOICE, WRITTEN_RESPONSE, SPOKEN_RESPONSE } = QuestionType;
const answer = (patch: Partial<Parameters<typeof reviewOutcome>[1]> = {}) => ({
  selectedOptionId: null,
  textAnswer: null,
  isCorrect: null,
  ...patch,
});

describe('reviewOutcome', () => {
  it('trắc nghiệm: chưa có câu trả lời hoặc chỉ đánh dấu là bỏ trống', () => {
    expect(reviewOutcome(SINGLE_CHOICE, undefined, 'ok')).toBe(ReviewOutcome.SKIPPED);
    expect(reviewOutcome(SINGLE_CHOICE, answer(), 'ok')).toBe(ReviewOutcome.SKIPPED);
  });

  it('trắc nghiệm: theo kết quả đã chấm lúc nộp, kể cả khi đáp án đúng đổi sau đó', () => {
    const chosen = answer({ selectedOptionId: 'a', isCorrect: true });
    expect(reviewOutcome(SINGLE_CHOICE, chosen, 'b')).toBe(ReviewOutcome.CORRECT);
    const missed = answer({ selectedOptionId: 'a', isCorrect: false });
    expect(reviewOutcome(SINGLE_CHOICE, missed, 'a')).toBe(ReviewOutcome.WRONG);
  });

  it('trắc nghiệm: chưa có kết quả chấm thì so với đáp án đúng hiện tại', () => {
    expect(reviewOutcome(SINGLE_CHOICE, answer({ selectedOptionId: 'a' }), 'a')).toBe(
      ReviewOutcome.CORRECT,
    );
    expect(reviewOutcome(SINGLE_CHOICE, answer({ selectedOptionId: 'a' }), 'b')).toBe(
      ReviewOutcome.WRONG,
    );
    expect(reviewOutcome(SINGLE_CHOICE, answer({ selectedOptionId: 'a' }), null)).toBe(
      ReviewOutcome.WRONG,
    );
  });

  it('câu trả lời mở: có bài là chờ chấm, trống hoặc chỉ khoảng trắng là bỏ trống', () => {
    expect(reviewOutcome(WRITTEN_RESPONSE, answer({ textAnswer: 'My answer' }), null)).toBe(
      ReviewOutcome.PENDING,
    );
    expect(reviewOutcome(WRITTEN_RESPONSE, answer({ textAnswer: '  \n ' }), null)).toBe(
      ReviewOutcome.SKIPPED,
    );
    expect(reviewOutcome(SPOKEN_RESPONSE, undefined, null)).toBe(ReviewOutcome.SKIPPED);
  });

  it('đếm kết quả theo từng loại', () => {
    const counts = emptyCounts();
    for (const outcome of [
      ReviewOutcome.CORRECT,
      ReviewOutcome.CORRECT,
      ReviewOutcome.WRONG,
      ReviewOutcome.SKIPPED,
      ReviewOutcome.PENDING,
    ]) {
      addOutcome(counts, outcome);
    }
    expect(counts).toEqual({ correct: 2, wrong: 1, skipped: 1, pending: 1 });
  });
});

describe('durationOf', () => {
  const at = (minutes: number) => new Date(Date.UTC(2026, 9, 17, 8, minutes));

  it('nộp trước giờ: từ lúc bắt đầu đến lúc nộp', () => {
    expect(durationOf(at(0), at(25), at(60))).toBe(25 * 60);
  });

  it('tự nộp trễ (job chạy sau hạn): không vượt thời lượng đề', () => {
    expect(durationOf(at(0), at(70), at(60))).toBe(60 * 60);
  });

  it('luyện theo Part không đếm giờ: tính tới lúc nộp', () => {
    expect(durationOf(at(0), at(12), null)).toBe(12 * 60);
  });
});
