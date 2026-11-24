import { describe, expect, it } from 'vitest';
import { AppException } from '../../common/errors/app.exception.js';
import {
  addDays,
  bucketKeys,
  bucketStart,
  dashboardCacheKeys,
  fillBuckets,
  MAX_RANGE_DAYS,
  resolveRange,
  todayInVietnam,
} from './dashboard-range.js';

describe('todayInVietnam', () => {
  it('lấy ngày theo giờ Việt Nam (UTC+7)', () => {
    // 17:30 UTC ngày 24 = 00:30 ngày 25 ở Việt Nam
    expect(todayInVietnam(new Date('2026-11-24T17:30:00Z'))).toBe('2026-11-25');
    expect(todayInVietnam(new Date('2026-11-24T16:59:00Z'))).toBe('2026-11-24');
  });
});

describe('addDays', () => {
  it('qua tháng, qua năm, năm nhuận', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('resolveRange', () => {
  const now = new Date('2026-11-24T03:00:00Z');

  it('mặc định 30 ngày gần nhất tính cả hôm nay', () => {
    const range = resolveRange({}, now);
    expect(range.from).toBe('2026-10-26');
    expect(range.to).toBe('2026-11-24');
  });

  it('chỉ có to: lùi 30 ngày từ to', () => {
    expect(resolveRange({ to: '2026-11-10' }, now).from).toBe('2026-10-12');
  });

  it('mốc thời gian là 00:00 giờ Việt Nam, kết thúc là đầu ngày sau to', () => {
    const range = resolveRange({ from: '2026-11-01', to: '2026-11-01' }, now);
    expect(range.start.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(range.endExclusive.toISOString()).toBe('2026-11-01T17:00:00.000Z');
  });

  it('from sau to → lỗi', () => {
    expect(() => resolveRange({ from: '2026-11-10', to: '2026-11-09' }, now)).toThrow(AppException);
  });

  it(`kỳ dài nhất ${MAX_RANGE_DAYS} ngày`, () => {
    const from = '2026-01-01';
    expect(() => resolveRange({ from, to: addDays(from, MAX_RANGE_DAYS - 1) }, now)).not.toThrow();
    expect(() => resolveRange({ from, to: addDays(from, MAX_RANGE_DAYS) }, now)).toThrow(
      AppException,
    );
  });
});

describe('bucketStart, bucketKeys', () => {
  it('tuần bắt đầu thứ Hai, Chủ nhật thuộc tuần trước đó', () => {
    expect(bucketStart('2026-11-25', 'week')).toBe('2026-11-23'); // thứ Tư
    expect(bucketStart('2026-11-23', 'week')).toBe('2026-11-23'); // thứ Hai
    expect(bucketStart('2026-11-29', 'week')).toBe('2026-11-23'); // Chủ nhật
    expect(bucketStart('2026-11-29', 'day')).toBe('2026-11-29');
  });

  it('theo ngày: đủ mọi ngày, tính cả 2 đầu', () => {
    expect(bucketKeys('2026-11-28', '2026-12-02', 'day')).toEqual([
      '2026-11-28',
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ]);
  });

  it('theo tuần: kỳ bắt đầu giữa tuần thì mốc đầu là thứ Hai trước đó', () => {
    expect(bucketKeys('2026-11-04', '2026-11-10', 'week')).toEqual(['2026-11-02', '2026-11-09']);
  });

  it('theo tuần qua năm mới', () => {
    expect(bucketKeys('2026-12-25', '2027-01-06', 'week')).toEqual([
      '2026-12-21',
      '2026-12-28',
      '2027-01-04',
    ]);
  });
});

describe('fillBuckets', () => {
  it('giữ thứ tự mốc, mốc thiếu là 0', () => {
    const keys = ['2026-11-01', '2026-11-02', '2026-11-03'];
    const rows = [
      { bucket: '2026-11-03', count: 5 },
      { bucket: '2026-11-01', count: 2 },
    ];
    expect(fillBuckets(keys, rows)).toEqual([2, 0, 5]);
  });
});

describe('dashboardCacheKeys', () => {
  it('khác kỳ hoặc khác cách gom thì khác key, cùng tiền tố dashboard:', () => {
    const range = resolveRange({ from: '2026-11-01', to: '2026-11-30' }, new Date());
    expect(dashboardCacheKeys.overview(range)).toBe('dashboard:overview:2026-11-01:2026-11-30');
    expect(dashboardCacheKeys.trends(range, 'week')).toBe(
      'dashboard:trends:2026-11-01:2026-11-30:week',
    );
  });
});
