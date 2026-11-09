import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  AssessmentStatus,
  AttemptStatus,
  Grader,
  QuestionType,
  type Skill,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { scoreSkills, strategyFor, type SkillScore } from '../attempts/grading/grading.js';
import { openMaxScore } from '../attempts/grading/toeic-sw-conversion.js';

/** Câu Speaking/Writing trong phạm vi bài làm */
export interface OpenQuestion {
  examQuestionId: string;
  skill: Skill;
  type: QuestionType;
  part: number;
}

export interface OpenScores {
  /** Điểm từng câu mở; null khi còn chờ chấm (hoặc chấm lỗi) */
  scores: Map<string, number | null>;
  /** Phiếu chấm vừa tạo (đưa vào hàng đợi sau khi transaction xong) */
  created: string[];
}

/** Lượt làm bài lưu skill_scores trước SPRINT-86 thiếu các trường câu mở: điền mặc định */
export function normalizeSkills(value: unknown, status: AttemptStatus): SkillScore[] {
  const skills = (value ?? []) as Partial<SkillScore>[];
  return skills.map((skill) => ({
    skill: skill.skill as Skill,
    correct: skill.correct ?? 0,
    wrong: skill.wrong ?? 0,
    skipped: skill.skipped ?? 0,
    total: skill.total ?? 0,
    openCount: skill.openCount ?? 0,
    openMax: skill.openMax ?? 0,
    openRaw: skill.openRaw === undefined ? (skill.openCount ? null : 0) : skill.openRaw,
    openPending:
      skill.openPending ?? (status === AttemptStatus.SUBMITTED ? (skill.openCount ?? 0) : 0),
    scaled: skill.scaled ?? null,
  }));
}

const isBlank = (text: string | null | undefined) => !text?.trim();

/**
 * Điểm câu Speaking/Writing của một lượt làm bài (SPRINT-86): tạo phiếu chấm lúc nộp bài, tổng hợp
 * điểm mỗi khi AI chấm xong một câu; đủ điểm mọi câu thì lượt làm sang GRADED
 */
@Injectable()
export class AttemptScoringService {
  private readonly logger = new Logger(AttemptScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Điểm từng câu mở. Writing: bỏ trống 0 điểm, không gọi AI; đã viết thì lấy điểm của phiếu chấm
   * (bản giáo viên ưu tiên hơn bản AI), chưa có phiếu và createMissing thì tạo phiếu PENDING.
   * Speaking chưa chấm bằng AI (làm ở đợt sau) nên luôn chờ chấm như trước
   */
  async openScores(
    tx: Prisma.TransactionClient,
    attemptId: string,
    questions: OpenQuestion[],
    createMissing: boolean,
  ): Promise<OpenScores> {
    const scores = new Map<string, number | null>();
    const created: string[] = [];
    if (questions.length === 0) return { scores, created };

    const answers = await tx.attemptAnswer.findMany({
      where: { attemptId, examQuestionId: { in: questions.map((q) => q.examQuestionId) } },
      select: {
        id: true,
        examQuestionId: true,
        textAnswer: true,
        assessments: { select: { grader: true, status: true, score: true } },
      },
    });
    const answerOf = new Map(answers.map((answer) => [answer.examQuestionId, answer]));

    for (const question of questions) {
      if (question.type !== QuestionType.WRITTEN_RESPONSE) {
        scores.set(question.examQuestionId, null);
        continue;
      }
      const answer = answerOf.get(question.examQuestionId);
      if (!answer || isBlank(answer.textAnswer)) {
        scores.set(question.examQuestionId, 0);
        continue;
      }
      const teacher = answer.assessments.find((a) => a.grader === Grader.TEACHER);
      const ai = answer.assessments.find((a) => a.grader === Grader.AI);
      const effective = teacher?.status === AssessmentStatus.DONE ? teacher : ai;
      if (effective?.status === AssessmentStatus.DONE && effective.score !== null) {
        scores.set(question.examQuestionId, Number(effective.score));
        continue;
      }
      scores.set(question.examQuestionId, null);
      if (!ai && createMissing) {
        const row = await tx.answerAssessment.create({
          data: {
            attemptAnswerId: answer.id,
            grader: Grader.AI,
            maxScore: openMaxScore(question.skill, question.part),
          },
          select: { id: true },
        });
        created.push(row.id);
      }
    }
    return { scores, created };
  }

  /**
   * Tổng hợp lại điểm câu mở của lượt làm bài (gọi sau mỗi câu AI chấm xong). Khóa dòng bài làm nên
   * hai câu chấm xong cùng lúc chỉ một lần chuyển GRADED. Trả true khi lượt làm vừa chấm xong
   */
  async refresh(attemptId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ status: AttemptStatus }[]>`
        SELECT status FROM exam_attempts WHERE id = ${attemptId}::uuid FOR UPDATE`;
      if (locked?.status !== AttemptStatus.SUBMITTED) return false;

      const attempt = await tx.examAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: {
          mode: true,
          examId: true,
          sectionId: true,
          skillScores: true,
          exam: { select: { scoringScale: true } },
        },
      });
      const items = await tx.examQuestion.findMany({
        where: {
          section: { examId: attempt.examId },
          sectionId: attempt.sectionId ?? undefined,
          question: { type: { in: [QuestionType.WRITTEN_RESPONSE, QuestionType.SPOKEN_RESPONSE] } },
        },
        select: {
          id: true,
          section: { select: { skill: true } },
          question: { select: { type: true, part: true } },
        },
      });
      const questions: OpenQuestion[] = items.map((item) => ({
        examQuestionId: item.id,
        skill: item.section.skill,
        type: item.question.type,
        part: item.question.part,
      }));
      const { scores } = await this.openScores(tx, attemptId, questions, false);

      // Phần trắc nghiệm giữ nguyên kết quả đã chấm lúc nộp, chỉ tính lại phần câu mở
      const open = new Map<
        Skill,
        Pick<SkillScore, 'openCount' | 'openMax' | 'openRaw' | 'openPending'>
      >();
      for (const question of questions) {
        const entry = open.get(question.skill) ?? {
          openCount: 0,
          openMax: 0,
          openRaw: 0,
          openPending: 0,
        };
        const score = scores.get(question.examQuestionId) ?? null;
        entry.openCount++;
        entry.openMax += openMaxScore(question.skill, question.part);
        if (score === null) {
          entry.openPending++;
          entry.openRaw = null;
        } else if (entry.openRaw !== null) {
          entry.openRaw += score;
        }
        open.set(question.skill, entry);
      }
      const skills = normalizeSkills(attempt.skillScores, AttemptStatus.SUBMITTED).map((skill) => ({
        ...skill,
        ...open.get(skill.skill),
      }));

      const strategy = strategyFor(attempt.exam.scoringScale, attempt.mode);
      const { skills: scored, total, pendingOpen } = scoreSkills(strategy, skills);
      await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          skillScores: scored as unknown as Prisma.InputJsonValue,
          ...(pendingOpen ? {} : { status: AttemptStatus.GRADED, scaledScore: total ?? 0 }),
        },
      });
      if (!pendingOpen) this.logger.log(`Bài làm ${attemptId} đã chấm xong`);
      return !pendingOpen;
    });
  }
}
