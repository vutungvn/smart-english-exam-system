import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AttemptAutoSubmitService } from './attempt-auto-submit.service.js';
import { SYNC_GRACE_SECONDS } from './attempt-rules.js';
import type { AttemptSubmissionService } from './attempt-submission.service.js';

const NOW = new Date('2026-11-05T08:00:00.000Z');

function setup(due: Promise<{ id: string }[]>, failing: string[] = []) {
  const findMany = vi.fn(() => due);
  const submit = vi.fn((id: string) =>
    failing.includes(id) ? Promise.reject(new Error('DB lỗi')) : Promise.resolve({}),
  );
  const service = new AttemptAutoSubmitService(
    { examAttempt: { findMany } } as unknown as PrismaService,
    { submit } as unknown as AttemptSubmissionService,
  );
  return { service, findMany, submit };
}

describe('AttemptAutoSubmitService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    // Job ghi log khi nộp xong hoặc gặp lỗi: tắt để kết quả test gọn
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('chỉ quét bài đang làm đã quá hạn cộng thời gian ân hạn đồng bộ, rồi nộp từng bài', async () => {
    const { service, findMany, submit } = setup(Promise.resolve([{ id: 'a' }, { id: 'b' }]));

    expect(await service.submitExpired()).toBe(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'IN_PROGRESS',
          expiresAt: { lt: new Date(NOW.getTime() - SYNC_GRACE_SECONDS * 1000) },
        },
      }),
    );
    expect(submit.mock.calls).toEqual([['a'], ['b']]);
  });

  it('một bài lỗi không chặn các bài còn lại', async () => {
    const { service, submit } = setup(Promise.resolve([{ id: 'a' }, { id: 'b' }, { id: 'c' }]), [
      'b',
    ]);

    expect(await service.submitExpired()).toBe(2);
    expect(submit).toHaveBeenCalledTimes(3);
  });

  it('lượt quét trước chưa xong thì bỏ qua lượt mới', async () => {
    let release: (rows: { id: string }[]) => void = () => undefined;
    const { service, findMany } = setup(new Promise((resolve) => (release = resolve)));

    const first = service.submitExpired();
    expect(await service.submitExpired()).toBe(0);
    release([]);
    expect(await first).toBe(0);
    expect(findMany).toHaveBeenCalledTimes(1);

    // Xong lượt trước thì lượt sau chạy bình thường
    await service.submitExpired();
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
