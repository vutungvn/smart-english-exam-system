import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import { AiCallStatus, AiFeature } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AiGateway } from './ai-gateway.service.js';
import { AiProvider, AiProviderError } from './ai-provider.js';
import type { AiQuotaService } from './ai-quota.service.js';
import type { AiGenerateRequest, AiProviderRequest, AiProviderResponse } from './ai.types.js';

// Bỏ thời gian chờ giữa các lần thử
vi.mock('node:timers/promises', () => ({ setTimeout: () => Promise.resolve() }));

type Reply = string | AiProviderError;

/** Trả lần lượt các kết quả cho trước, ghi lại model của từng lần gọi */
class ScriptedProvider extends AiProvider {
  readonly models = ['main', 'backup'];
  readonly calls: string[] = [];

  constructor(private readonly replies: Reply[]) {
    super();
  }

  generateJson(request: AiProviderRequest): Promise<AiProviderResponse> {
    this.calls.push(request.model);
    const reply = this.replies.shift() ?? new AiProviderError('hết kịch bản', 500);
    if (reply instanceof AiProviderError) return Promise.reject(reply);
    return Promise.resolve({ text: reply, inputTokens: 10, outputTokens: 5 });
  }
}

/** Bộ đếm lượt trong bộ nhớ thay cho Redis */
class MemoryQuota {
  readonly counts = new Map<string, number>();

  take(key: string, limit: number): Promise<boolean> {
    const used = (this.counts.get(key) ?? 0) + 1;
    if (used > limit) return Promise.resolve(false);
    this.counts.set(key, used);
    return Promise.resolve(true);
  }

  give(key: string): Promise<void> {
    this.counts.set(key, (this.counts.get(key) ?? 0) - 1);
    return Promise.resolve();
  }

  used(key: string): Promise<number> {
    return Promise.resolve(this.counts.get(key) ?? 0);
  }

  total(prefix: string): number {
    return [...this.counts]
      .filter(([key]) => key.startsWith(prefix))
      .reduce((sum, [, value]) => sum + value, 0);
  }
}

const schema = z.object({ answer: z.string() });
type Answer = z.infer<typeof schema>;
const OK = JSON.stringify({ answer: 'ok' });

const request = (
  overrides: Partial<AiGenerateRequest<Answer>> = {},
): AiGenerateRequest<Answer> => ({
  feature: AiFeature.EXPLANATION,
  userId: 'student-1',
  userDailyLimit: 20,
  schema,
  systemInstruction: 'system',
  prompt: 'prompt',
  fake: () => ({ answer: 'fake' }),
  ...overrides,
});

function setup(replies: Reply[], budget = 1000) {
  const provider = new ScriptedProvider(replies);
  const quota = new MemoryQuota();
  const create = vi.fn<(args: { data: { status: AiCallStatus } }) => Promise<object>>(() =>
    Promise.resolve({}),
  );
  const prisma = { aiUsageLog: { create } } as unknown as PrismaService;
  const config = { get: () => budget } as unknown as ConfigService<Env, true>;
  const gateway = new AiGateway(provider, quota as unknown as AiQuotaService, prisma, config);
  const statuses = () => create.mock.calls.map(([args]) => args.data.status);
  return { gateway, provider, quota, statuses };
}

describe('AiGateway', () => {
  it('gọi model chính, trả kết quả đã kiểm tra và tính 1 lượt', async () => {
    const { gateway, provider, quota, statuses } = setup([OK]);
    await expect(gateway.generate(request())).resolves.toEqual({
      data: { answer: 'ok' },
      model: 'main',
    });
    expect(provider.calls).toEqual(['main']);
    expect(statuses()).toEqual([AiCallStatus.SUCCESS]);
    expect(quota.total('ai:quota:')).toBe(1);
    expect(quota.total('ai:budget:')).toBe(1);
  });

  it('model chính hết lượt (429) thì chuyển sang model dự phòng', async () => {
    const { gateway, provider, statuses } = setup([new AiProviderError('quota', 429), OK]);
    await expect(gateway.generate(request())).resolves.toMatchObject({ model: 'backup' });
    expect(provider.calls).toEqual(['main', 'backup']);
    expect(statuses()).toEqual([AiCallStatus.FAILED, AiCallStatus.SUCCESS]);
  });

  it('lỗi tạm thời (503, quá thời gian chờ) thì thử lại cùng model', async () => {
    const { gateway, provider } = setup([new AiProviderError('busy', 503), OK]);
    await expect(gateway.generate(request())).resolves.toMatchObject({ model: 'main' });
    expect(provider.calls).toEqual(['main', 'main']);
  });

  it('kết quả sai cấu trúc thì thử lại, hết lượt thử thì sang model dự phòng', async () => {
    const { gateway, provider, statuses } = setup(['{"wrong":1}', 'không phải JSON', OK]);
    await expect(gateway.generate(request())).resolves.toMatchObject({ model: 'backup' });
    expect(provider.calls).toEqual(['main', 'main', 'backup']);
    expect(statuses()).toEqual([
      AiCallStatus.INVALID_OUTPUT,
      AiCallStatus.INVALID_OUTPUT,
      AiCallStatus.SUCCESS,
    ]);
  });

  it('cả hai model hết lượt thì báo AI_UNAVAILABLE và trả lại lượt đã giữ', async () => {
    const { gateway, quota } = setup([
      new AiProviderError('quota', 429),
      new AiProviderError('quota', 429),
    ]);
    await expect(gateway.generate(request())).rejects.toMatchObject({
      code: ErrorCode.AI_UNAVAILABLE,
    });
    expect(quota.total('ai:quota:')).toBe(0);
    expect(quota.total('ai:budget:')).toBe(0);
  });

  it('key sai (400, 403) thì dừng ngay, không thử lại', async () => {
    const { gateway, provider } = setup([new AiProviderError('API key not valid', 400)]);
    await expect(gateway.generate(request())).rejects.toMatchObject({
      code: ErrorCode.AI_UNAVAILABLE,
    });
    expect(provider.calls).toEqual(['main']);
  });

  it('học viên hết lượt thì báo AI_QUOTA_EXCEEDED, không gọi model', async () => {
    const { gateway, provider, quota } = setup([OK, OK, OK]);
    await gateway.generate(request({ userDailyLimit: 2 }));
    await gateway.generate(request({ userDailyLimit: 2 }));
    await expect(gateway.generate(request({ userDailyLimit: 2 }))).rejects.toMatchObject({
      code: ErrorCode.AI_QUOTA_EXCEEDED,
      details: { limit: 2 },
    });
    expect(provider.calls).toHaveLength(2);
    expect(quota.total('ai:budget:')).toBe(2);
  });

  it('chỉ dùng phần ngân sách chung được chia; hết thì trả lại lượt của học viên', async () => {
    // Ngân sách 3 lượt, giải thích được 70% → 2 lượt
    const { gateway, quota } = setup([OK, OK, OK], 3);
    await gateway.generate(request({ budgetShare: 0.7 }));
    await gateway.generate(request({ budgetShare: 0.7 }));
    await expect(gateway.generate(request({ budgetShare: 0.7 }))).rejects.toMatchObject({
      code: ErrorCode.AI_UNAVAILABLE,
    });
    expect(quota.total('ai:quota:')).toBe(2);
  });
});
