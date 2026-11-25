import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS } from '../../infra/settings/settings.schema.js';
import { settingsDiff } from './settings-audit.js';

describe('settingsDiff', () => {
  it('chỉ giữ tham số có thay đổi', () => {
    expect(settingsDiff(SETTING_DEFAULTS.ai, { dailyBudget: 1000, explainDailyLimit: 5 })).toEqual({
      before: { explainDailyLimit: 20 },
      after: { explainDailyLimit: 5 },
    });
  });

  it('bảng quy đổi ghi gọn thành chuỗi', () => {
    const writing = [
      { raw: 0, score: 0 },
      { raw: 100, score: 200 },
    ];
    const diff = settingsDiff(SETTING_DEFAULTS.scoring, { ...SETTING_DEFAULTS.scoring, writing });
    expect(diff.after).toEqual({ writing: '0→0, 100→200' });
    expect(diff.before).toEqual({
      writing: '0→0, 20→40, 35→80, 50→110, 65→140, 80→170, 90→190, 100→200',
    });
  });

  it('không đổi gì → rỗng', () => {
    expect(settingsDiff(SETTING_DEFAULTS.recording, { retentionDays: 30 })).toEqual({
      before: {},
      after: {},
    });
  });
});
