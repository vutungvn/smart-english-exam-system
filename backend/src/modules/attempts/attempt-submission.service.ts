import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AttemptStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { gradeAttempt, strategyFor, type SkillScore } from './grading/grading.js';
import type { AttemptResult } from './attempts.types.js';

/** Các cột kết quả của lượt làm bài, dùng để dựng AttemptResult */
export const resultSelect = {
  id: true,
  mode: true,
  status: true,
  submittedAt: true,
  correctCount: true,
  wrongCount: true,
  skippedCount: true,
  rawScore: true,
  scaledScore: true,
  skillScores: true,
  exam: { select: { scoringScale: true } },
} satisfies Prisma.ExamAttemptSelect;

type ResultRow = Prisma.ExamAttemptGetPayload<{ select: typeof resultSelect }>;

/** null khi lượt chưa nộp hoặc đã hủy */
export function toResult(row: ResultRow): AttemptResult | null {
  if (
    !row.submittedAt ||
    (row.status !== AttemptStatus.SUBMITTED && row.status !== AttemptStatus.GRADED)
  ) {
    return null;
  }
  const skills = (row.skillScores ?? []) as unknown as SkillScore[];
  return {
    attemptId: row.id,
    status: row.status,
    submittedAt: row.submittedAt,
    scoring: strategyFor(row.exam.scoringScale, row.mode).name,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    skippedCount: row.skippedCount,
    rawScore: Number(row.rawScore ?? 0),
    scaledScore: row.scaledScore === null ? null : Number(row.scaledScore),
    pendingOpenCount:
      row.status === AttemptStatus.SUBMITTED
        ? skills.reduce((sum, skill) => sum + skill.openCount, 0)
        : 0,
    skillScores: skills,
  };
}

/**
 * Nộp bài và chấm phần trắc nghiệm (Ke_hoach Mục 7.2). Học viên bấm nộp và job tự nộp khi hết giờ
 * cùng gọi vào đây: khóa dòng bài làm (SELECT … FOR UPDATE) nên chỉ một lần chấm, lần sau trả lại
 * kết quả đã có, không chấm lại.
 */
@Injectable()
export class AttemptSubmissionService {
  constructor(private readonly prisma: PrismaService) {}

  /** studentId: chỉ cho chủ bài nộp (job tự nộp không truyền) */
  async submit(attemptId: string, studentId?: string): Promise<AttemptResult> {
    await this.prisma.$transaction(
      async (tx) => {
        const [locked] = await tx.$queryRaw<{ status: AttemptStatus; student_id: string }[]>`
          SELECT status, student_id FROM exam_attempts WHERE id = ${attemptId}::uuid FOR UPDATE`;
        if (!locked || (studentId && locked.student_id !== studentId)) {
          throw new AppException(ErrorCode.ATTEMPT_NOT_FOUND);
        }
        if (locked.status === AttemptStatus.CANCELLED) {
          throw new AppException(
            ErrorCode.ATTEMPT_NOT_IN_PROGRESS,
            'Bài làm đã hủy, không nộp được',
          );
        }
        // Đã nộp (bấm nộp hai lần, hoặc job tự nộp đến trước): giữ nguyên kết quả cũ
        if (locked.status !== AttemptStatus.IN_PROGRESS) return;

        await this.grade(tx, attemptId);
      },
      { timeout: 30_000 },
    );

    const row = await this.prisma.examAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: resultSelect,
    });
    return toResult(row) as AttemptResult;
  }

  private async grade(tx: Prisma.TransactionClient, attemptId: string): Promise<void> {
    const attempt = await tx.examAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: {
        mode: true,
        examId: true,
        sectionId: true,
        exam: { select: { scoringScale: true } },
      },
    });
    // Phạm vi chấm: cả đề, hoặc chỉ Part đang luyện
    const examQuestions = await tx.examQuestion.findMany({
      where: { section: { examId: attempt.examId }, sectionId: attempt.sectionId ?? undefined },
      orderBy: [{ section: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
      select: {
        id: true,
        section: { select: { skill: true } },
        question: {
          select: {
            type: true,
            options: { where: { isCorrect: true }, select: { id: true }, take: 1 },
          },
        },
      },
    });
    const answers = await tx.attemptAnswer.findMany({
      where: { attemptId },
      select: { examQuestionId: true, selectedOptionId: true },
    });

    const result = gradeAttempt({
      scale: attempt.exam.scoringScale,
      mode: attempt.mode,
      questions: examQuestions.map((item) => ({
        examQuestionId: item.id,
        skill: item.section.skill,
        type: item.question.type,
        correctOptionId: item.question.options[0]?.id ?? null,
      })),
      answers,
    });

    // Đúng/sai từng câu (dùng cho màn xem lại, thống kê điểm yếu); câu bỏ trống, câu mở để NULL
    const marked = (value: boolean) =>
      [...result.marks].filter(([, mark]) => mark === value).map(([id]) => id);
    for (const value of [true, false]) {
      const ids = marked(value);
      if (ids.length === 0) continue;
      await tx.attemptAnswer.updateMany({
        where: { attemptId, examQuestionId: { in: ids } },
        data: { isCorrect: value },
      });
    }

    const pending = result.pendingOpen > 0;
    await tx.examAttempt.update({
      where: { id: attemptId },
      data: {
        // Còn câu Speaking/Writing: giữ SUBMITTED chờ AI chấm (SPRINT-86) rồi mới GRADED
        status: pending ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED,
        submittedAt: new Date(),
        correctCount: result.correct,
        wrongCount: result.wrong,
        skippedCount: result.skipped,
        rawScore: result.rawScore,
        // Đề không có câu nào trong phạm vi (dữ liệu lỗi) vẫn phải có điểm khi GRADED
        scaledScore: pending ? null : (result.scaledScore ?? 0),
        skillScores: result.skills as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
