import { describe, expect, it } from 'vitest';
import { QuestionType, Skill } from '../../generated/prisma/enums.js';
import {
  describeLockedFields,
  lockedQuestionChanges,
  type LockableQuestion,
} from './content-lock.js';

const current: LockableQuestion = {
  content: 'The manager asked all staff to ------- the meeting.',
  type: QuestionType.SINGLE_CHOICE,
  skill: Skill.READING,
  part: 5,
  groupId: null,
  orderInGroup: null,
  prepSeconds: null,
  responseSeconds: null,
  options: [
    { label: 'A', content: 'attend', isCorrect: true },
    { label: 'B', content: 'attends', isCorrect: false },
    { label: 'C', content: 'attending', isCorrect: false },
    { label: 'D', content: 'attended', isCorrect: false },
  ],
};
const copyOptions = () => current.options.map((option) => ({ ...option }));

describe('lockedQuestionChanges', () => {
  it('form gửi lại y nguyên mọi trường (chỉ sửa giải thích) → không có trường khóa nào đổi', () => {
    expect(lockedQuestionChanges(current, { ...current, options: copyOptions() })).toEqual([]);
  });

  it('không gửi trường nào → không đổi', () => {
    expect(lockedQuestionChanges(current, {})).toEqual([]);
  });

  it('sửa nội dung câu', () => {
    expect(lockedQuestionChanges(current, { content: current.content + ' ' })).toEqual(['content']);
  });

  it('đổi đáp án đúng, sửa chữ một phương án, đổi thứ tự, thêm/bớt phương án → đổi phương án', () => {
    const moved = copyOptions().map((option) => ({ ...option, isCorrect: option.label === 'B' }));
    const edited = copyOptions();
    edited[3] = { label: 'D', content: 'attendance', isCorrect: false };
    const reordered = [...copyOptions()].reverse();
    for (const options of [moved, edited, reordered, copyOptions().slice(0, 3)]) {
      expect(lockedQuestionChanges(current, { options })).toEqual(['options']);
    }
  });

  it('đổi Part, chuyển nhóm, đổi thời gian Speaking', () => {
    expect(
      lockedQuestionChanges(current, { part: 6, groupId: 'group-1', orderInGroup: 1 }),
    ).toEqual(['part', 'group']);
    expect(lockedQuestionChanges(current, { prepSeconds: 30 })).toEqual(['timing']);
  });

  it('mô tả trường bị khóa bằng tiếng Việt', () => {
    expect(describeLockedFields(['content', 'options'])).toBe(
      'nội dung câu, phương án, đáp án đúng',
    );
  });
});
