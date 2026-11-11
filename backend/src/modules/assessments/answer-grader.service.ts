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
  fakeSpeakingResult,
  recordingSeconds,
  SPEAKING_SYSTEM,
  speakingPrompt,
  speakingResultSchema,
  speakingScore,
  speakingSubScores,
  type SpeakingResult,
} from './speaking-grading.js';
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
/** Bài nói dài nhất 60 giây ở 32 kbps khoảng 240 KB; quá mức này là tệp lỗi */
const MAX_RECORDING_BYTES = 5 * 1024 * 1024;
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
      audioKey: true,
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
              responseSeconds: true,
              group: { select: { imageKey: true, passage: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AnswerAssessmentSelect;

type AssessmentRow = Prisma.AnswerAssessmentGetPayload<{ select: typeof assessmentSelect }>;

/** Kết quả chấm một câu, đã quy về các cột của answer_assessments */
interface GradedAnswer {
  score: number;
  criteria: Prisma.InputJsonValue;
  feedback: string;
  transcript: string | null;
  corrections?: Prisma.InputJsonValue;
  improvedAnswer: string | null;
  model: string;
}

/** AI hết ngân sách trong ngày (AiGateway gửi kèm giờ reset) */
function quotaResetAt(error: unknown): Date | null {
  if (!(error instanceof AppException) || error.code !== ErrorCode.AI_UNAVAILABLE) return null;
  const resetAt = (error.details as { resetAt?: string } | undefined)?.resetAt;
  return resetAt ? new Date(resetAt) : null;
}

/**
 * Chấm một câu Speaking/Writing (một job của hàng đợi sw-grading, SPRINT-86): gửi đề, rubric, bài làm
 * cho AI qua AiGateway (Writing: bài viết, Part 1 kèm ảnh; Speaking: tệp ghi âm, kèm ảnh/bảng thông
 * tin nếu có), kết quả đúng thang thì lưu DONE rồi tổng hợp điểm bài làm. Không gửi tên, email, id
 * của học viên cho AI
 */
@Injectable()
export class AnswerGraderService {
  private readonly logger = new Logger(AnswerGraderService.name);

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
    const { type } = assessment.attemptAnswer.examQuestion.question;
    if (type !== QuestionType.WRITTEN_RESPONSE && type !== QuestionType.SPOKEN_RESPONSE) return;

    const tries = assessment.tries + 1;
    await this.prisma.answerAssessment.update({
      where: { id: assessment.id },
      data: { tries, nextRunAt: null },
    });

    try {
      const result =
        type === QuestionType.WRITTEN_RESPONSE
          ? await this.gradeWriting(assessment, tries)
          : await this.gradeSpeaking(assessment, tries);
      await this.prisma.answerAssessment.updateMany({
        where: { id: assessment.id, status: AssessmentStatus.PENDING },
        data: {
          status: AssessmentStatus.DONE,
          score: result.score,
          criteria: result.criteria,
          feedback: result.feedback,
          transcript: result.transcript,
          corrections: result.corrections,
          improvedAnswer: result.improvedAnswer || null,
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

  private async gradeWriting(assessment: AssessmentRow, tries: number): Promise<GradedAnswer> {
    const { textAnswer, attempt, examQuestion } = assessment.attemptAnswer;
    const { question } = examQuestion;
    const answer = textAnswer ?? '';
    const image =
      question.part === 1
        ? await this.loadFile(
            question.imageKey ?? question.group?.imageKey ?? null,
            MAX_IMAGE_BYTES,
          )
        : null;
    const maxScore = Number(assessment.maxScore);

    const { data, model } = await this.ai.generate<WritingResult>({
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
    return {
      score: data.score,
      criteria: data.criteria,
      feedback: data.feedback,
      transcript: null,
      corrections: data.corrections,
      improvedAnswer: data.improvedAnswer,
      model,
    };
  }

  private async gradeSpeaking(assessment: AssessmentRow, tries: number): Promise<GradedAnswer> {
    const { audioKey, attempt, examQuestion } = assessment.attemptAnswer;
    const { question } = examQuestion;
    const recording = await this.loadFile(audioKey, MAX_RECORDING_BYTES);
    // Tệp đã bị xóa (quá hạn lưu) hoặc lỗi kho tệp: thử lại vài lần rồi báo chấm lỗi
    if (!recording) throw new AppException(ErrorCode.ASSESSMENT_RECORDING_MISSING);

    // Ảnh của câu (P2) và ảnh bảng thông tin của nhóm (P4)
    const images: AiAttachment[] = [];
    for (const key of new Set([question.imageKey, question.group?.imageKey])) {
      const image = await this.loadFile(key ?? null, MAX_IMAGE_BYTES);
      if (image) images.push(image);
    }
    const maxScore = Number(assessment.maxScore);
    const seconds = recordingSeconds(recording.data.length);

    const { data, model } = await this.ai.generate<SpeakingResult>({
      feature: AiFeature.SW_GRADING,
      // Chỉ để ghi ai_usage_logs, không gửi cho AI
      userId: attempt.studentId,
      schema: speakingResultSchema(question.part, maxScore),
      systemInstruction: SPEAKING_SYSTEM,
      prompt: speakingPrompt({
        part: question.part,
        content: question.content,
        passage: question.group?.passage ?? null,
        sampleAnswer: question.sampleAnswer,
        responseSeconds: question.responseSeconds,
        seconds,
        imageCount: images.length,
      }),
      // Bài nói luôn ở cuối (prompt nói rõ thứ tự)
      attachments: [...images, { ...recording, mimeType: 'audio/mpeg' }],
      temperature: 0.1,
      fake: () =>
        fakeSpeakingResult({
          part: question.part,
          maxScore,
          seconds,
          responseSeconds: question.responseSeconds,
          sampleAnswer: question.sampleAnswer,
          tries,
        }) as SpeakingResult,
    });
    const subScores = speakingSubScores(data);
    return {
      score: speakingScore(data),
      criteria: subScores ? { ...data.criteria, subScores } : data.criteria,
      feedback: data.feedback,
      transcript: data.transcript || null,
      improvedAnswer: data.improvedAnswer,
      model,
    };
  }

  /** Ảnh hoặc bài nói trong kho tệp; không có key, không đọc được hoặc quá lớn thì null */
  private async loadFile(key: string | null, maxBytes: number): Promise<AiAttachment | null> {
    if (!key) return null;
    try {
      const object = await this.storage.get(key);
      if (!object) return null;
      if ((object.contentLength ?? 0) > maxBytes) {
        object.body.destroy();
        return null;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of object.body) chunks.push(chunk as Buffer);
      return { mimeType: object.contentType ?? 'image/jpeg', data: Buffer.concat(chunks) };
    } catch (error) {
      this.logger.warn(`Không đọc được tệp ${key}: ${(error as Error).message}`);
      return null;
    }
  }
}
