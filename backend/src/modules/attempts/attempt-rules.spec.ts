import { describe, expect, it } from 'vitest';
import {
  answerWrite,
  mergeAnswer,
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
