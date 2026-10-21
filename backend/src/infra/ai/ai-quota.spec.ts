import { describe, expect, it } from 'vitest';
import { nextPacificMidnight, pacificDay } from './ai-quota.js';

describe('pacificDay', () => {
  it('giờ mùa hè (UTC-7): 13h59 giờ VN vẫn là ngày hôm trước', () => {
    expect(pacificDay(new Date('2026-10-22T06:59:00Z'))).toBe('2026-10-21');
    expect(pacificDay(new Date('2026-10-22T07:00:00Z'))).toBe('2026-10-22');
  });

  it('từ 1/11 dùng giờ chuẩn (UTC-8)', () => {
    expect(pacificDay(new Date('2026-11-03T07:59:00Z'))).toBe('2026-11-02');
    expect(pacificDay(new Date('2026-11-03T08:00:00Z'))).toBe('2026-11-03');
  });
});

describe('nextPacificMidnight', () => {
  it('giờ mùa hè: 0h PDT là 7h UTC (14h giờ VN)', () => {
    expect(nextPacificMidnight(new Date('2026-10-21T10:15:00Z')).toISOString()).toBe(
      '2026-10-22T07:00:00.000Z',
    );
  });

  it('ngày đổi giờ 1/11: ngày mới bắt đầu lúc 0h PST = 8h UTC', () => {
    expect(nextPacificMidnight(new Date('2026-11-01T12:00:00Z')).toISOString()).toBe(
      '2026-11-02T08:00:00.000Z',
    );
  });

  it('đúng 0h thì lấy 0h của ngày hôm sau', () => {
    expect(nextPacificMidnight(new Date('2026-10-22T07:00:00Z')).toISOString()).toBe(
      '2026-10-23T07:00:00.000Z',
    );
  });
});
