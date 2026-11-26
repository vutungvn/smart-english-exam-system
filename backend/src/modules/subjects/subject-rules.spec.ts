import { describe, expect, it } from 'vitest';
import { Skill } from '../../generated/prisma/enums.js';
import {
  invalidParts,
  normalizeParts,
  partsOfSkill,
  removedParts,
  SUBJECT_CODE_PATTERN,
} from './subject-rules.js';

describe('Luật chương trình thi, chủ đề', () => {
  it('Part của từng kỹ năng theo cấu trúc TOEIC', () => {
    expect(partsOfSkill(Skill.LISTENING)).toEqual([1, 2, 3, 4]);
    expect(partsOfSkill(Skill.READING)).toEqual([5, 6, 7]);
    expect(partsOfSkill(Skill.SPEAKING)).toEqual([1, 2, 3, 4, 5]);
    expect(partsOfSkill(Skill.WRITING)).toEqual([1, 2, 3]);
  });

  it('Part không thuộc kỹ năng', () => {
    expect(invalidParts(Skill.READING, [5, 6])).toEqual([]);
    expect(invalidParts(Skill.READING, [7, 1, 3, 1])).toEqual([1, 3]);
    expect(invalidParts(Skill.WRITING, [4])).toEqual([4]);
  });

  it('bỏ trùng, sắp tăng dần; Part bị bỏ khi sửa', () => {
    expect(normalizeParts([4, 3, 4])).toEqual([3, 4]);
    expect(removedParts([3, 4], [4])).toEqual([3]);
    expect(removedParts([3], [3, 4])).toEqual([]);
  });

  it('mã chương trình: chữ hoa, số, gạch dưới, 2–50 ký tự', () => {
    for (const code of ['TOEIC', 'IELTS_ACADEMIC', 'B2']) {
      expect(SUBJECT_CODE_PATTERN.test(code)).toBe(true);
    }
    for (const code of ['toeic', 'T', 'IELTS ACADEMIC', 'TOEIC-2', 'A'.repeat(51)]) {
      expect(SUBJECT_CODE_PATTERN.test(code)).toBe(false);
    }
  });
});
