import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { Env } from '../../config/env.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AiFeature, AttemptStatus, QuestionType } from '../../generated/prisma/enums.js';
import { AiGateway } from '../../infra/ai/ai-gateway.service.js';
import type { AiAttachment } from '../../infra/ai/ai.types.js';
import { FAKE_MODEL } from '../../infra/ai/fake-ai.provider.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import type { AiExplanation, AiQuota, AiQuotas } from './ai-explanations.types.js';
import {
  contentHashOf,
  EXPLANATION_SYSTEM,
  explanationPrompt,
  explanationSchema,
  fakeExplanation,
  type ExplainSource,
  type ExplanationContent,
} from './explanation.js';

const SUBMITTED: AttemptStatus[] = [AttemptStatus.SUBMITTED, AttemptStatus.GRADED];
/** Giải thích đáp án dùng tối đa 70% ngân sách AI chung, phần còn lại để chấm Speaking/Writing */
const EXPLANATION_BUDGET_SHARE = 0.7;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const questionSelect = {
  id: true,
  type: true,
  skill: true,
  part: true,
  content: true,
  explanation: true,
  imageKey: true,
  options: {
    orderBy: { orderIndex: 'asc' },
    select: { label: true, content: true, isCorrect: true },
  },
  group: { select: { passage: true, transcript: true, imageKey: true } },
} satisfies Prisma.QuestionSelect;

/**
 * Giải thích đáp án bằng AI ở màn xem lại (Mục 7.4). Chỉ chủ bài làm, sau khi nộp. Lời giải thích là
 * của câu hỏi nên cache dùng chung mọi học viên (ai_explanations); lấy từ cache không tính lượt
 */
@Injectable()
export class AiExplanationsService {
  private readonly logger = new Logger(AiExplanationsService.name);
  private readonly dailyLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiGateway,
    private readonly storage: StorageService,
    config: ConfigService<Env, true>,
  ) {
    this.dailyLimit = config.get('AI_EXPLAIN_DAILY_LIMIT', { infer: true });
  }

  async quotas(user: AuthUser): Promise<AiQuotas> {
    return { explanation: await this.quota(user) };
  }

  async explain(attemptId: string, examQuestionId: string, user: AuthUser): Promise<AiExplanation> {
    const question = await this.loadQuestion(attemptId, examQuestionId, user);
    if (question.type !== QuestionType.SINGLE_CHOICE) {
      throw new AppException(ErrorCode.AI_EXPLANATION_NOT_SUPPORTED);
    }

    const source: ExplainSource = {
      skill: question.skill,
      part: question.part,
      content: question.content,
      explanation: question.explanation,
      imageKey: question.imageKey,
      options: question.options,
      group: question.group,
    };
    const schema = explanationSchema(source.options.map((option) => option.label));
    const contentHash = contentHashOf(source);

    // Cache còn đúng nội dung câu hiện tại; bản sinh bằng dữ liệu mẫu chỉ dùng khi vẫn chưa có key
    const cached = await this.prisma.aiExplanation.findUnique({
      where: { questionId: question.id },
      select: { contentHash: true, content: true, model: true, updatedAt: true },
    });
    if (cached?.contentHash === contentHash && (cached.model === FAKE_MODEL) === this.ai.usesFake) {
      const parsed = schema.safeParse(cached.content);
      if (parsed.success) {
        return this.toExplanation(examQuestionId, parsed.data, cached.model, cached.updatedAt, {
          cached: true,
          quota: await this.quota(user),
        });
      }
    }

    const image = await this.loadImage(question.imageKey ?? question.group?.imageKey ?? null);
    const result = await this.ai.generate({
      feature: AiFeature.EXPLANATION,
      userId: user.id,
      userDailyLimit: this.dailyLimit,
      budgetShare: EXPLANATION_BUDGET_SHARE,
      schema,
      systemInstruction: EXPLANATION_SYSTEM,
      prompt: explanationPrompt(source, image !== null),
      attachments: image ? [image] : [],
      fake: () => fakeExplanation(source),
    });

    const saved = await this.prisma.aiExplanation.upsert({
      where: { questionId: question.id },
      create: { questionId: question.id, contentHash, content: result.data, model: result.model },
      update: { contentHash, content: result.data, model: result.model },
      select: { updatedAt: true },
    });
    return this.toExplanation(examQuestionId, result.data, result.model, saved.updatedAt, {
      cached: false,
      quota: await this.quota(user),
    });
  }

  private quota(user: AuthUser): Promise<AiQuota> {
    return this.ai.usage(AiFeature.EXPLANATION, user.id, this.dailyLimit);
  }

  /** Câu thuộc bài đã nộp của chính học viên; đang làm bài thì không hỏi AI được (lộ đáp án) */
  private async loadQuestion(attemptId: string, examQuestionId: string, user: AuthUser) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, studentId: user.id },
      select: { examId: true, sectionId: true, status: true },
    });
    if (!attempt) throw new AppException(ErrorCode.ATTEMPT_NOT_FOUND);
    if (!SUBMITTED.includes(attempt.status)) {
      throw new AppException(ErrorCode.ATTEMPT_NOT_SUBMITTED);
    }

    // Luyện theo Part: chỉ câu của Part đó
    const item = await this.prisma.examQuestion.findFirst({
      where: {
        id: examQuestionId,
        section: { examId: attempt.examId, id: attempt.sectionId ?? undefined },
      },
      select: { question: { select: questionSelect } },
    });
    if (!item) throw new AppException(ErrorCode.ATTEMPT_QUESTION_NOT_FOUND);
    return item.question;
  }

  /** Ảnh của câu (Part 1) hoặc của nhóm; không đọc được thì giải thích không kèm ảnh */
  private async loadImage(key: string | null): Promise<AiAttachment | null> {
    if (!key) return null;
    try {
      const object = await this.storage.get(key);
      if (!object) return null;
      if ((object.contentLength ?? 0) > MAX_IMAGE_BYTES) {
        object.body.destroy();
        return null;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of object.body) chunks.push(chunk as Buffer);
      return { mimeType: object.contentType ?? 'image/jpeg', data: Buffer.concat(chunks) };
    } catch (error) {
      this.logger.warn(`Không đọc được ảnh ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  private toExplanation(
    examQuestionId: string,
    content: ExplanationContent,
    model: string,
    generatedAt: Date,
    extra: { cached: boolean; quota: AiQuota },
  ): AiExplanation {
    return { examQuestionId, ...content, model, generatedAt, ...extra };
  }
}
