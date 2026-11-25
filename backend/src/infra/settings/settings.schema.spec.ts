import { describe, expect, it } from 'vitest';
import {
  parseSettings,
  SETTING_DEFAULTS,
  SETTING_GROUPS,
  validateSettings,
  type ConversionPoint,
} from './settings.schema.js';

/** Lỗi khi thay bảng Listening, dạng "đường dẫn: thông báo" */
function listeningErrors(listening: ConversionPoint[]): string[] {
  const result = validateSettings('scoring', { ...SETTING_DEFAULTS.scoring, listening });
  return result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

const START = { raw: 0, score: 5 };
const END = { raw: 100, score: 495 };

describe('Cấu hình hệ thống', () => {
  it.each(SETTING_GROUPS)('giá trị mặc định của nhóm %s hợp lệ', (group) => {
    expect(validateSettings(group, SETTING_DEFAULTS[group]).success).toBe(true);
  });

  it('phần đã lưu đè lên mặc định; {} hoặc chưa có dòng → mặc định', () => {
    expect(parseSettings('ai', { explainDailyLimit: 5 })).toEqual({
      dailyBudget: 1000,
      explainDailyLimit: 5,
    });
    expect(parseSettings('ai', {})).toEqual(SETTING_DEFAULTS.ai);
    expect(parseSettings('recording', undefined)).toEqual(SETTING_DEFAULTS.recording);
  });

  it('dữ liệu lưu bị hỏng → null', () => {
    expect(parseSettings('recording', { retentionDays: 'x' })).toBeNull();
    expect(parseSettings('scoring', { listening: [] })).toBeNull();
  });

  it('bảng quy đổi: mốc tăng dần, điểm không giảm, đúng khoảng và bước', () => {
    expect(listeningErrors([START, END])).toEqual([]);
    expect(listeningErrors([START, { raw: 0, score: 50 }, END])).toEqual([
      'listening.1.raw: Mốc phải lớn hơn mốc trước',
    ]);
    expect(listeningErrors([START, { raw: 40, score: 200 }, { raw: 50, score: 100 }, END])).toEqual(
      ['listening.2.score: Điểm không được thấp hơn mốc trước'],
    );
    expect(listeningErrors([START, { raw: 50, score: 252 }, END])).toEqual([
      'listening.1.score: Điểm phải là bội số của 5',
    ]);
    expect(listeningErrors([START, { raw: 50, score: 500 }, END])).toContain(
      'listening.1.score: Điểm phải từ 5 đến 495',
    );
  });

  it('bảng quy đổi: phải đủ mốc đầu, mốc cuối và số mốc', () => {
    expect(listeningErrors([{ raw: 10, score: 20 }, END])).toEqual([
      'listening.0.raw: Mốc đầu phải là 0 → 5 điểm',
    ]);
    expect(listeningErrors([START, { raw: 90, score: 480 }])).toEqual([
      'listening.1.raw: Mốc cuối phải là 100 → 495 điểm',
    ]);
    expect(listeningErrors([START])).toEqual(['listening: Bảng quy đổi cần từ 2 đến 30 mốc']);
  });

  it('hạn mức AI: ngoài khoảng, hoặc lượt một học viên lớn hơn tổng → lỗi', () => {
    expect(validateSettings('ai', { dailyBudget: 9, explainDailyLimit: 1 }).success).toBe(false);
    const result = validateSettings('ai', { dailyBudget: 10, explainDailyLimit: 11 });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['explainDailyLimit']]);
  });

  it('số ngày giữ ghi âm chỉ từ 7 đến 30', () => {
    const valid = (retentionDays: number) =>
      validateSettings('recording', { retentionDays }).success;
    expect([6, 7, 30, 31].map(valid)).toEqual([false, true, true, false]);
  });
});
