import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import { AiCallStatus, AiFeature } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiProvider, AiProviderError } from './ai-provider.js';
import {
  budgetKey,
  formatVietnamTime,
  nextPacificMidnight,
  pacificDay,
  userQuotaKey,
} from './ai-quota.js';
import { AiQuotaService } from './ai-quota.service.js';
import type {
  AiGenerateRequest,
  AiGenerateResult,
  AiProviderResponse,
  AiQuotaStatus,
} from './ai.types.js';
import { FakeAiProvider } from './fake-ai.provider.js';

/** Số lần gọi tối đa với mỗi model khi lỗi tạm thời (5xx, quá thời gian chờ, kết quả sai cấu trúc) */
const MAX_TRIES_PER_MODEL = 2;
const RETRY_BASE_MS = 1000;

const FEATURE_LABEL: Record<AiFeature, string> = {
  [AiFeature.EXPLANATION]: 'giải thích đáp án bằng AI',
};

type QuotaScope = Pick<
  AiGenerateRequest<unknown>,
  'feature' | 'userId' | 'userDailyLimit' | 'budgetShare'
>;

interface UsageEntry {
  request: Pick<AiGenerateRequest<unknown>, 'feature' | 'userId'>;
  model: string;
  startedAt: number;
  status: AiCallStatus;
  response?: AiProviderResponse;
  errorCode?: string;
}

/** Chờ lâu dần (1s, 2s…) cộng thêm chút ngẫu nhiên để các yêu cầu thử lại không dồn cùng lúc */
function retryDelay(attempt: number): number {
  return RETRY_BASE_MS * 2 ** (attempt - 1) + Math.random() * 250;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Mọi lượt gọi AI đi qua đây (Mục 7.4): giữ lượt (của người dùng, trong ngân sách chung) → gọi model
 * chính, hết lượt (429) thì sang model dự phòng, lỗi tạm thời thì thử lại → kiểm tra kết quả bằng Zod
 * → ghi ai_usage_logs. Thất bại thì trả lại lượt đã giữ. Không log nội dung gửi và nhận
 */
@Injectable()
export class AiGateway {
  private readonly logger = new Logger(AiGateway.name);

  constructor(
    private readonly provider: AiProvider,
    private readonly quota: AiQuotaService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Đang dùng dữ liệu mẫu (chưa có GEMINI_API_KEY) */
  get usesFake(): boolean {
    return this.provider instanceof FakeAiProvider;
  }

  async generate<T>(request: AiGenerateRequest<T>): Promise<AiGenerateResult<T>> {
    const taken = await this.take(request);
    try {
      return await this.call(request);
    } catch (error) {
      // Lượt gọi thất bại không tính vào hạn mức
      await this.giveBack(taken);
      throw error;
    }
  }

  /** Lượt hôm nay của người dùng cho một tính năng (hiện trên giao diện) */
  async usage(feature: AiFeature, userId: string, limit: number): Promise<AiQuotaStatus> {
    const now = new Date();
    const key = userQuotaKey(feature, userId, pacificDay(now));
    const used = Math.min(await this.quota.used(key), limit);
    return { limit, used, remaining: limit - used, resetAt: nextPacificMidnight(now) };
  }

  /** Giữ lượt của người dùng rồi lượt trong ngân sách chung; trả các key đã giữ để trả lại khi lỗi */
  private async take(request: QuotaScope): Promise<string[]> {
    const now = new Date();
    const day = pacificDay(now);
    const taken: string[] = [];

    const limit = request.userDailyLimit;
    if (request.userId && limit !== undefined) {
      const key = userQuotaKey(request.feature, request.userId, day);
      if (!(await this.quota.take(key, limit))) {
        const resetAt = nextPacificMidnight(now);
        throw new AppException(
          ErrorCode.AI_QUOTA_EXCEEDED,
          `Bạn đã dùng hết ${limit} lượt ${FEATURE_LABEL[request.feature]} hôm nay, ` +
            `lượt mới có lúc ${formatVietnamTime(resetAt)}`,
          { limit, resetAt: resetAt.toISOString() },
        );
      }
      taken.push(key);
    }

    // Mỗi tính năng chỉ dùng một phần ngân sách chung, chừa lượt cho tính năng khác
    const budget = Math.floor(
      this.config.get('AI_DAILY_BUDGET', { infer: true }) * (request.budgetShare ?? 1),
    );
    if (!(await this.quota.take(budgetKey(day), budget))) {
      await this.giveBack(taken);
      throw new AppException(
        ErrorCode.AI_UNAVAILABLE,
        'Hệ thống đã dùng hết lượt AI hôm nay, vui lòng thử lại sau',
      );
    }
    taken.push(budgetKey(day));
    return taken;
  }

  private async giveBack(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.quota.give(key)));
  }

  private async call<T>(request: AiGenerateRequest<T>): Promise<AiGenerateResult<T>> {
    const jsonSchema = z.toJSONSchema(request.schema);

    for (const model of this.provider.models) {
      for (let attempt = 1; attempt <= MAX_TRIES_PER_MODEL; attempt++) {
        const startedAt = Date.now();
        try {
          const response = await this.provider.generateJson({
            model,
            systemInstruction: request.systemInstruction,
            prompt: request.prompt,
            attachments: request.attachments ?? [],
            jsonSchema,
            temperature: request.temperature ?? 0.2,
            fake: request.fake,
          });
          const parsed = request.schema.safeParse(parseJson(response.text));
          if (parsed.success) {
            await this.log({ request, model, startedAt, status: AiCallStatus.SUCCESS, response });
            return { data: parsed.data, model };
          }
          await this.log({
            request,
            model,
            startedAt,
            status: AiCallStatus.INVALID_OUTPUT,
            response,
          });
          this.logger.warn(
            `${model} trả kết quả sai cấu trúc (${request.feature}, lần ${attempt})`,
          );
        } catch (error) {
          if (!(error instanceof AiProviderError)) throw error;
          await this.log({
            request,
            model,
            startedAt,
            status: AiCallStatus.FAILED,
            errorCode: error.status ? String(error.status) : 'TIMEOUT',
          });
          // Model này hết lượt (theo phút hoặc theo ngày): sang model dự phòng
          if (error.status === 429) {
            this.logger.warn(`${model} hết lượt (429), chuyển sang model dự phòng`);
            break;
          }
          // 4xx khác (key sai, yêu cầu sai cấu trúc): thử lại cũng vậy
          if (error.status !== undefined && error.status < 500) {
            this.logger.error(`${model} từ chối yêu cầu (${error.status}): ${error.message}`);
            throw new AppException(ErrorCode.AI_UNAVAILABLE);
          }
          this.logger.warn(
            `${model} lỗi tạm thời (${error.status ?? 'quá thời gian chờ'}, lần ${attempt})`,
          );
        }
        if (attempt < MAX_TRIES_PER_MODEL) await sleep(retryDelay(attempt));
      }
    }
    throw new AppException(ErrorCode.AI_UNAVAILABLE);
  }

  /** Ghi ai_usage_logs: chỉ số liệu, không ghi nội dung gửi và nhận */
  private async log(entry: UsageEntry): Promise<void> {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          userId: entry.request.userId,
          feature: entry.request.feature,
          model: entry.model,
          status: entry.status,
          inputTokens: entry.response?.inputTokens ?? 0,
          outputTokens: entry.response?.outputTokens ?? 0,
          latencyMs: Date.now() - entry.startedAt,
          errorCode: entry.errorCode,
        },
      });
    } catch (error) {
      // Lỗi ghi nhật ký không được làm hỏng lượt gọi AI
      this.logger.error(`Không ghi được ai_usage_logs: ${(error as Error).message}`);
    }
  }
}
