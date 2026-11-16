import { describe, expect, it } from 'vitest';
import { agreementRow } from './teacher-assessments.service.js';

describe('agreementRow: độ lệch điểm AI so với giáo viên', () => {
  it('tính MAE, độ lệch có dấu, tỉ lệ khớp; quy về % thang để so giữa các Part', () => {
    const row = agreementRow(
      [
        { aiScore: 3, teacherScore: 2, maxScore: 3 }, // AI cao hơn 1 điểm (33,3%)
        { aiScore: 6, teacherScore: 6, maxScore: 6 }, // khớp
        { aiScore: 1, teacherScore: 4, maxScore: 5 }, // AI thấp hơn 3 điểm (60%)
      ],
      'SPEAKING',
      null,
    );
    expect(row).toMatchObject({
      skill: 'SPEAKING',
      part: null,
      count: 3,
      mae: 1.33,
      maePercent: 31.1,
      biasPercent: -8.9,
      exactRate: 33.3,
      withinOneRate: 66.7,
      aiMeanPercent: 73.3,
      teacherMeanPercent: 82.2,
    });
  });

  it('không có cặp nào: mọi chỉ số bằng 0', () => {
    expect(agreementRow([])).toMatchObject({ count: 0, mae: 0, exactRate: 0 });
  });
});
