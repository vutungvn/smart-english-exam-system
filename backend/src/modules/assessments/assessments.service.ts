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
  AssessmentReviewRequest,
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
  updatedAt: true,
  reviewer: { select: { fullName: true } },
} satisfies Prisma.AnswerAssessmentSelect;

type AssessmentRow = Prisma.AnswerAssessmentGetPayload<{ select: typeof assessmentViewSelect }>;

/** Phiếu chấm → dữ liệu hiện ở màn xem lại; tiêu chí theo thứ tự cố định, có nhãn tiếng Việt */
export function toQuestionAssessment(row: AssessmentRow): QuestionAssessment {
  const done = row.status === AssessmentStatus.DONE;
  const criteria = (row.criteria ?? {}) as Record<string, unknown>;
  const subScores = (criteria.subScores ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    grader: row.grader,
    reviewerName: row.reviewer?.fullName ?? null,
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
    regradesLeft: row.grader === Grader.AI ? Math.max(0, MAX_REGRADES - row.regradeCount) : 0,
    gradedAt: row.gradedAt,
    updatedAt: row.updatedAt,
  };
}

/** Bản giáo viên chấm (đã xong) thay cho bản AI; chưa có thì dùng bản AI */
export function effectiveAssessment(rows: AssessmentRow[]): AssessmentRow | undefined {
  const teacher = rows.find(
    (row) => row.grader === Grader.TEACHER && row.status === AssessmentStatus.DONE,
  );
  return teacher ?? rows.find((row) => row.grader === Grader.AI);
}

/** Yêu cầu chấm lại đang lưu trên câu trả lời; null khi chưa yêu cầu */
export function toReviewRequest(answer: {
  reviewRequestedAt: Date | null;
  reviewRequestNote: string | null;
}): AssessmentReviewRequest | null {
  return answer.reviewRequestedAt
    ? { requestedAt: answer.reviewRequestedAt, note: answer.reviewRequestNote ?? '' }
    : null;
}

/** Tiến độ chấm, chấm lại câu lỗi (SPRINT-86), yêu cầu giáo viên chấm lại (SPRINT-91) của học viên */
@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: GradingQueueService,
  ) {}

  /**
   * null khi bài làm không có câu nào cần AI chấm. Câu giáo viên đã chấm lại tính là đã chấm xong dù
   * bản AI lỗi
   */
  async progress(attemptId: string): Promise<GradingProgress | null> {
    const found = await this.prisma.answerAssessment.findMany({
      where: { grader: Grader.AI, attemptAnswer: { attemptId } },
      select: {
        status: true,
        nextRunAt: true,
        attemptAnswer: {
          select: {
            assessments: {
              where: { grader: Grader.TEACHER, status: AssessmentStatus.DONE },
              select: { id: true },
            },
          },
        },
      },
    });
    if (found.length === 0) return null;
    const rows = found.map((row) =>
      row.attemptAnswer.assessments.length > 0
        ? { status: AssessmentStatus.DONE, nextRunAt: null }
        : row,
    );
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
      select: {
        ...assessmentViewSelect,
        attemptAnswer: {
          select: {
            audioDeletedAt: true,
            assessments: {
              where: { grader: Grader.TEACHER, status: AssessmentStatus.DONE },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!row) throw new AppException(ErrorCode.ASSESSMENT_NOT_FOUND);
    // Giáo viên đã chấm câu này: điểm giáo viên là điểm chính thức, không cần AI chấm lại
    if (row.attemptAnswer.assessments.length > 0) {
      throw new AppException(ErrorCode.ASSESSMENT_TEACHER_REVIEWED);
    }
    if (row.status !== AssessmentStatus.FAILED)
      throw new AppException(ErrorCode.ASSESSMENT_NOT_FAILED);
    if (row.regradeCount >= MAX_REGRADES) {
      throw new AppException(ErrorCode.ASSESSMENT_REGRADE_LIMIT);
    }
    // Bài nói đã tự xóa vì quá hạn lưu: chấm lại chắc chắn lỗi, báo luôn và không tốn lượt chấm lại
    if (row.attemptAnswer.audioDeletedAt) {
      throw new AppException(ErrorCode.ASSESSMENT_RECORDING_MISSING);
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

  /**
   * Học viên yêu cầu giáo viên chấm lại một câu AI đã chấm xong (mỗi câu một lần). Câu vào hàng đợi
   * "Bài cần chấm lại" của giáo viên; câu chấm lỗi đã tự vào hàng đợi nên không cần yêu cầu
   */
  async requestReview(
    attemptId: string,
    assessmentId: string,
    user: AuthUser,
    note: string,
  ): Promise<AssessmentReviewRequest> {
    const row = await this.prisma.answerAssessment.findFirst({
      where: {
        id: assessmentId,
        grader: Grader.AI,
        attemptAnswer: { attemptId, attempt: { studentId: user.id } },
      },
      select: {
        status: true,
        attemptAnswer: {
          select: {
            id: true,
            reviewRequestedAt: true,
            assessments: {
              where: { grader: Grader.TEACHER, status: AssessmentStatus.DONE },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!row) throw new AppException(ErrorCode.ASSESSMENT_NOT_FOUND);
    const answer = row.attemptAnswer;
    if (answer.assessments.length > 0)
      throw new AppException(ErrorCode.ASSESSMENT_TEACHER_REVIEWED);
    if (row.status !== AssessmentStatus.DONE)
      throw new AppException(ErrorCode.ASSESSMENT_NOT_GRADED);
    if (answer.reviewRequestedAt) {
      throw new AppException(ErrorCode.ASSESSMENT_REVIEW_ALREADY_REQUESTED);
    }

    const requestedAt = new Date();
    // Điều kiện trong WHERE: bấm hai lần cùng lúc chỉ một lần được ghi
    const { count } = await this.prisma.attemptAnswer.updateMany({
      where: { id: answer.id, reviewRequestedAt: null },
      data: { reviewRequestedAt: requestedAt, reviewRequestNote: note },
    });
    if (count === 0) throw new AppException(ErrorCode.ASSESSMENT_REVIEW_ALREADY_REQUESTED);
    return { requestedAt, note };
  }
}
