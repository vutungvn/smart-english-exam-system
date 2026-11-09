import { Injectable, Logger } from '@nestjs/common';
import { DelayedError, type Job } from 'bullmq';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  AiFeature,
  AssessmentStatus,
  AttemptStatus,
  QuestionType,
} from '../../generated/prisma/enums.js';
import { AiGateway } from '../../infra/ai/ai-gateway.service.js';
import type { AiAttachment } from '../../infra/ai/ai.types.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { AttemptScoringService } from './attempt-scoring.service.js';
import {
  fakeWritingResult,
  WRITING_SYSTEM,
  writingPrompt,
  writingResultSchema,
  type WritingResult,
} from './writing-grading.js';

export interface GradingJobData {
  assessmentId: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Hết lượt AI trong ngày: chấm tiếp sau giờ reset một chút, rải ngẫu nhiên để không dồn cùng lúc */
const RESUME_JITTER_MS = 60_000;

const assessmentSelect = {
  id: true,
  status: true,
  tries: true,
  maxScore: true,
  attemptAnswer: {
    select: {
      textAnswer: true,
      attempt: { select: { id: true, studentId: true, status: true } },
      examQuestion: {
        select: {
          question: {
            select: {
              type: true,
              part: true,
              content: true,
              sampleAnswer: true,
              imageKey: true,
              group: { select: { imageKey: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AnswerAssessmentSelect;

/** AI hết ngân sách trong ngày (AiGateway gửi kèm giờ reset) */
function quotaResetAt(error: unknown): Date | null {
  if (!(error instanceof AppException) || error.code !== ErrorCode.AI_UNAVAILABLE) return null;
  const resetAt = (error.details as { resetAt?: string } | undefined)?.resetAt;
  return resetAt ? new Date(resetAt) : null;
}

/**
 * Chấm một câu Writing (một job của hàng đợi sw-grading, SPRINT-86): gửi đề, rubric, bài làm (Part 1
 * kèm ảnh) cho AI qua AiGateway, kết quả đúng thang thì lưu DONE rồi tổng hợp điểm bài làm. Không gửi
 * tên, email, id của học viên cho AI
 */
@Injectable()
export class WritingGraderService {
  private readonly logger = new Logger(WritingGraderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiGateway,
    private readonly storage: StorageService,
    private readonly scoring: AttemptScoringService,
  ) {}

  /** Có giới hạn tốc độ gọi Gemini (15 lượt/phút) hay không: dùng dữ liệu mẫu thì không cần */
  get usesRealAi(): boolean {
    return !this.ai.usesFake;
  }

  async process(job: Job<GradingJobData>, token?: string): Promise<void> {
    const assessment = await this.prisma.answerAssessment.findUnique({
      where: { id: job.data.assessmentId },
      select: assessmentSelect,
    });
    // Phiếu đã chấm xong, đã bị xóa, hoặc bài làm không còn chờ chấm: bỏ qua (job lặp lại)
    if (
      !assessment ||
      assessment.status !== AssessmentStatus.PENDING ||
      assessment.attemptAnswer.attempt.status !== AttemptStatus.SUBMITTED
    ) {
      return;
    }
    const { question } = assessment.attemptAnswer.examQuestion;
    // Speaking chấm ở đợt sau
    if (question.type !== QuestionType.WRITTEN_RESPONSE) return;

    const tries = assessment.tries + 1;
    await this.prisma.answerAssessment.update({
      where: { id: assessment.id },
      data: { tries, nextRunAt: null },
    });

    try {
      const result = await this.grade(assessment, tries);
      await this.prisma.answerAssessment.updateMany({
        where: { id: assessment.id, status: AssessmentStatus.PENDING },
        data: {
          status: AssessmentStatus.DONE,
          score: result.data.score,
          criteria: result.data.criteria,
          feedback: result.data.feedback,
          corrections: result.data.corrections,
          improvedAnswer: result.data.improvedAnswer || null,
          model: result.model,
          errorMessage: null,
          gradedAt: new Date(),
        },
      });
      await this.scoring.refresh(assessment.attemptAnswer.attempt.id);
    } catch (error) {
      const resetAt = quotaResetAt(error);
      if (resetAt) {
        // Hết lượt AI hôm nay: không tính là một lần thử, hoãn job tới giờ có lượt mới
        const runAt = resetAt.getTime() + Math.random() * RESUME_JITTER_MS;
        await this.prisma.answerAssessment.update({
          where: { id: assessment.id },
          data: { tries: assessment.tries, nextRunAt: new Date(runAt) },
        });
        await job.moveToDelayed(runAt, token);
        throw new DelayedError();
      }
      const last = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      this.logger.warn(
        `Chấm phiếu ${assessment.id} lỗi (lần ${tries}${last ? ', dừng' : ''}): ${(error as Error).message}`,
      );
      if (!last) throw error;
      await this.prisma.answerAssessment.updateMany({
        where: { id: assessment.id, status: AssessmentStatus.PENDING },
        data: {
          status: AssessmentStatus.FAILED,
          errorMessage:
            error instanceof AppException
              ? error.message.slice(0, 500)
              : 'Lỗi hệ thống khi chấm bài, vui lòng chấm lại sau',
        },
      });
    }
  }

  private async grade(
    assessment: Prisma.AnswerAssessmentGetPayload<{ select: typeof assessmentSelect }>,
    tries: number,
  ) {
    const { textAnswer, attempt, examQuestion } = assessment.attemptAnswer;
    const { question } = examQuestion;
    const answer = textAnswer ?? '';
    const image =
      question.part === 1
        ? await this.loadImage(question.imageKey ?? question.group?.imageKey ?? null)
        : null;
    const maxScore = Number(assessment.maxScore);

    return this.ai.generate<WritingResult>({
      feature: AiFeature.SW_GRADING,
      // Chỉ để ghi ai_usage_logs, không gửi cho AI
      userId: attempt.studentId,
      schema: writingResultSchema(maxScore),
      systemInstruction: WRITING_SYSTEM,
      prompt: writingPrompt({
        part: question.part,
        content: question.content,
        sampleAnswer: question.sampleAnswer,
        answer,
        hasImage: image !== null,
      }),
      attachments: image ? [image] : [],
      temperature: 0.1,
      fake: () => fakeWritingResult(question.part, answer, tries) as WritingResult,
    });
  }

  /** Ảnh của câu Part 1; không đọc được thì chấm không kèm ảnh */
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
}
