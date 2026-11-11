import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AssessmentStatus, Grader } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type {
  AssessmentCorrection,
  AssessmentCriterion,
  AssessmentSubScore,
  GradingProgress,
  QuestionAssessment,
} from './assessments.types.js';
import { GradingQueueService } from './grading-queue.service.js';
import { READ_ALOUD_SUB_SCORES, SPEAKING_CRITERIA } from './speaking-grading.js';
import { WRITING_CRITERIA } from './writing-grading.js';

/**
 * Thứ tự hiện tiêu chí của cả hai kỹ năng: phát âm, ngữ điệu, trôi chảy (Speaking), ngữ pháp, từ
 * vựng (chung), mạch lạc (Writing), hoàn thành yêu cầu (chung). Phiếu chỉ có tiêu chí của kỹ năng mình
 */
const CRITERIA_ORDER: { key: string; label: string }[] = [
  'pronunciation',
  'intonation',
  'fluency',
  'grammar',
  'vocabulary',
  'coherence',
  'task',
].map((key) => [...SPEAKING_CRITERIA, ...WRITING_CRITERIA].find((c) => c.key === key)!);

/** Học viên được bấm "Chấm lại" tối đa 2 lần cho mỗi câu chấm lỗi */
export const MAX_REGRADES = 2;

export const assessmentViewSelect = {
  id: true,
  grader: true,
  status: true,
  score: true,
  maxScore: true,
  criteria: true,
  feedback: true,
  transcript: true,
  corrections: true,
  improvedAnswer: true,
  errorMessage: true,
  nextRunAt: true,
  regradeCount: true,
  gradedAt: true,
} satisfies Prisma.AnswerAssessmentSelect;

type AssessmentRow = Prisma.AnswerAssessmentGetPayload<{ select: typeof assessmentViewSelect }>;

/** Phiếu chấm → dữ liệu hiện ở màn xem lại; tiêu chí theo thứ tự cố định, có nhãn tiếng Việt */
export function toQuestionAssessment(row: AssessmentRow): QuestionAssessment {
  const done = row.status === AssessmentStatus.DONE;
  const criteria = (row.criteria ?? {}) as Record<string, unknown>;
  const subScores = (criteria.subScores ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    status: row.status,
    score: row.score === null ? null : Number(row.score),
    maxScore: Number(row.maxScore),
    criteria: done
      ? CRITERIA_ORDER.filter(({ key }) => typeof criteria[key] === 'number').map(
          ({ key, label }): AssessmentCriterion => ({ key, label, score: criteria[key] as number }),
        )
      : [],
    subScores: done
      ? READ_ALOUD_SUB_SCORES.filter(({ key }) => typeof subScores[key] === 'number').map(
          ({ key, label, max }): AssessmentSubScore => ({
            key,
            label,
            max,
            score: subScores[key] as number,
          }),
        )
      : [],
    transcript: done ? row.transcript : null,
    feedback: row.feedback,
    corrections: (row.corrections ?? []) as unknown as AssessmentCorrection[],
    improvedAnswer: row.improvedAnswer,
    errorMessage: row.status === AssessmentStatus.FAILED ? row.errorMessage : null,
    nextRunAt: row.status === AssessmentStatus.PENDING ? row.nextRunAt : null,
    regradesLeft: Math.max(0, MAX_REGRADES - row.regradeCount),
    gradedAt: row.gradedAt,
  };
}

/** Bản giáo viên chấm (đã xong) thay cho bản AI; chưa có thì dùng bản AI */
export function effectiveAssessment(rows: AssessmentRow[]): AssessmentRow | undefined {
  const teacher = rows.find(
    (row) => row.grader === Grader.TEACHER && row.status === AssessmentStatus.DONE,
  );
  return teacher ?? rows.find((row) => row.grader === Grader.AI);
}

/** Tiến độ chấm, chấm lại câu lỗi của học viên (SPRINT-86) */
@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: GradingQueueService,
  ) {}

  /** null khi bài làm không có câu nào cần AI chấm */
  async progress(attemptId: string): Promise<GradingProgress | null> {
    const rows = await this.prisma.answerAssessment.findMany({
      where: { grader: Grader.AI, attemptAnswer: { attemptId } },
      select: { status: true, nextRunAt: true },
    });
    if (rows.length === 0) return null;
    const count = (status: AssessmentStatus) => rows.filter((row) => row.status === status).length;
    const waiting = rows
      .filter((row) => row.status === AssessmentStatus.PENDING && row.nextRunAt)
      .map((row) => (row.nextRunAt as Date).getTime());
    return {
      total: rows.length,
      done: count(AssessmentStatus.DONE),
      pending: count(AssessmentStatus.PENDING),
      failed: count(AssessmentStatus.FAILED),
      waitingUntil: waiting.length ? new Date(Math.max(...waiting)) : null,
    };
  }

  /** Học viên bấm "Chấm lại" một câu chấm lỗi: về PENDING, xếp đầu hàng đợi */
  async regrade(
    attemptId: string,
    assessmentId: string,
    user: AuthUser,
  ): Promise<QuestionAssessment> {
    const row = await this.prisma.answerAssessment.findFirst({
      where: {
        id: assessmentId,
        grader: Grader.AI,
        attemptAnswer: { attemptId, attempt: { studentId: user.id } },
      },
      select: assessmentViewSelect,
    });
    if (!row) throw new AppException(ErrorCode.ASSESSMENT_NOT_FOUND);
    if (row.status !== AssessmentStatus.FAILED)
      throw new AppException(ErrorCode.ASSESSMENT_NOT_FAILED);
    if (row.regradeCount >= MAX_REGRADES) {
      throw new AppException(ErrorCode.ASSESSMENT_REGRADE_LIMIT);
    }

    // Điều kiện trong WHERE: bấm hai lần cùng lúc chỉ một lần được tính
    const { count } = await this.prisma.answerAssessment.updateMany({
      where: {
        id: assessmentId,
        status: AssessmentStatus.FAILED,
        regradeCount: { lt: MAX_REGRADES },
      },
      data: {
        status: AssessmentStatus.PENDING,
        regradeCount: { increment: 1 },
        errorMessage: null,
        nextRunAt: null,
      },
    });
    if (count === 0) throw new AppException(ErrorCode.ASSESSMENT_NOT_FAILED);
    await this.queue.enqueue([assessmentId], 'regrade');

    const updated = await this.prisma.answerAssessment.findUniqueOrThrow({
      where: { id: assessmentId },
      select: assessmentViewSelect,
    });
    return toQuestionAssessment(updated);
  }
}
