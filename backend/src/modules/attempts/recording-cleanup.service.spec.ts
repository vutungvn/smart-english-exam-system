import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { StorageService } from '../../infra/storage/storage.service.js';
import { RecordingCleanupService } from './recording-cleanup.service.js';

const NOW = new Date('2026-11-12T20:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

interface Row {
  id: string;
  audioKey: string;
}

/** rows: các câu còn bài nói quá hạn; failing: key xóa lỗi (kho tệp hỏng) */
function setup(rows: Row[], failing: string[] = []) {
  const remaining = [...rows];
  const findMany = vi.fn(({ where, take }: { where: { id: { notIn: string[] } }; take: number }) =>
    Promise.resolve(remaining.filter((row) => !where.id.notIn.includes(row.id)).slice(0, take)),
  );
  const updateMany = vi.fn(({ where }: { where: { id: string } }) => {
    const index = remaining.findIndex((row) => row.id === where.id);
    if (index >= 0) remaining.splice(index, 1);
    return Promise.resolve({ count: index >= 0 ? 1 : 0 });
  });
  const remove = vi.fn((key: string) =>
    failing.includes(key) ? Promise.reject(new Error('S3 lỗi')) : Promise.resolve(),
  );
  const service = new RecordingCleanupService(
    { attemptAnswer: { findMany, updateMany } } as unknown as PrismaService,
    { delete: remove } as unknown as StorageService,
    { get: () => 30 } as unknown as ConfigService<never, true>,
  );
  return { service, findMany, updateMany, remove };
}

describe('RecordingCleanupService', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('chỉ lấy bài nói của bài đã nộp quá 30 ngày, hoặc bài đã hủy bắt đầu quá 30 ngày', async () => {
    const { service, findMany } = setup([]);
    await service.cleanup(NOW);

    const cutoff = new Date(NOW.getTime() - 30 * DAY_MS);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          audioKey: { not: null },
          attempt: {
            OR: [
              { status: { in: ['SUBMITTED', 'GRADED'] }, submittedAt: { lt: cutoff } },
              { status: 'CANCELLED', startedAt: { lt: cutoff } },
            ],
          },
          id: { notIn: [] },
        },
      }),
    );
  });

  it('xóa tệp rồi mới bỏ audio_key, ghi audio_deleted_at', async () => {
    const { service, remove, updateMany } = setup([
      { id: 'a', audioKey: 'recordings/a.mp3' },
      { id: 'b', audioKey: 'recordings/b.mp3' },
    ]);

    expect(await service.cleanup(NOW)).toBe(2);
    expect(remove.mock.calls).toEqual([['recordings/a.mp3'], ['recordings/b.mp3']]);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'a', audioKey: 'recordings/a.mp3' },
      data: { audioKey: null, audioDeletedAt: NOW },
    });
  });

  it('xóa tệp lỗi: giữ nguyên audio_key để lần sau thử lại, không chặn các bài khác, không lặp vô hạn', async () => {
    const { service, updateMany } = setup(
      [
        { id: 'a', audioKey: 'recordings/a.mp3' },
        { id: 'b', audioKey: 'recordings/b.mp3' },
      ],
      ['recordings/a.mp3'],
    );

    expect(await service.cleanup(NOW)).toBe(1);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'b' } });
  });

  it('lượt trước chưa xong thì bỏ qua lượt mới', async () => {
    const { service, findMany } = setup([]);
    let release: (rows: Row[]) => void = () => undefined;
    findMany.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));

    const first = service.cleanup(NOW);
    expect(await service.cleanup(NOW)).toBe(0);
    release([]);
    expect(await first).toBe(0);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
