import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { WithMeta } from '../../common/types/api-response.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  AssessmentStatus,
  AttemptStatus,
  Grader,
  QuestionType,
  Skill,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { openMaxScore } from '../attempts/grading/toeic-sw-conversion.js';
import { MediaUrlService } from '../media/media-url.service.js';
import { AttemptNotificationsService } from '../notifications/attempt-notifications.service.js';
import {
  assessmentViewSelect,
  toQuestionAssessment,
  toReviewRequest,
} from './assessments.service.js';
import { AttemptScoringService } from './attempt-scoring.service.js';
import type {
  AgreementQueryDto,
  CalibrationQueryDto,
  GradeAnswerDto,
  TeacherAssessmentQueryDto,
} from './dto/teacher-assessment.dto.js';
import { READ_ALOUD_SUB_SCORES, SPEAKING_CRITERIA } from './speaking-grading.js';
import {
  ReviewReason,
  type AgreementPair,
  type AgreementRow,
  type AgreementStats,
  type CalibrationSample,
  type ReviewCriterionOption,
  type ReviewSubScoreOption,
  type TeacherReviewDetail,
  type TeacherReviewItem,
} from './teacher-assessments.types.js';
import { WRITING_CRITERIA } from './writing-grading.js';

const OPEN_TYPES: QuestionType[] = [QuestionType.WRITTEN_RESPONSE, QuestionType.SPOKEN_RESPONSE];
const SUBMITTED: AttemptStatus[] = [AttemptStatus.SUBMITTED, AttemptStatus.GRADED];
const TEACHER_DONE = { grader: Grader.TEACHER, status: AssessmentStatus.DONE };

/** Mã ẩn danh ổn định của học viên: giáo viên không cần biết tên, email để chấm (D19) */
export function studentCode(studentId: string): string {
  return `HV-${createHash('sha256').update(studentId).digest('hex').slice(0, 6).toUpperCase()}`;
}

const itemSelect = {
  id: true,
  reviewRequestedAt: true,
  reviewRequestNote: true,
  attempt: {
    select: {
      id: true,
      studentId: true,
      submittedAt: true,
      exam: { select: { title: true, authorId: true } },
    },
  },
  examQuestion: {
    select: { orderIndex: true, section: { select: { skill: true, part: true } } },
  },
  assessments: { select: { ...assessmentViewSelect, blindReview: true } },
} satisfies Prisma.AttemptAnswerSelect;

const detailSelect = {
  ...itemSelect,
  textAnswer: true,
  audioKey: true,
  audioDeletedAt: true,
  examQuestion: {
    select: {
      orderIndex: true,
      section: { select: { skill: true, part: true } },
      question: {
        select: {
          type: true,
          content: true,
          imageKey: true,
          sampleAnswer: true,
          responseSeconds: true,
          group: { select: { passage: true, imageKey: true } },
        },
      },
    },
  },
} satisfies Prisma.AttemptAnswerSelect;

type ItemRow = Prisma.AttemptAnswerGetPayload<{ select: typeof itemSelect }>;
type DetailRow = Prisma.AttemptAnswerGetPayload<{ select: typeof detailSelect }>;

/** Câu Speaking/Writing của bài đã nộp (giáo viên chỉ chấm được các câu này) */
function openAnswerWhere(user: AuthUser, scope: 'ALL' | 'MINE', skill?: Skill) {
  return {
    attempt: { status: { in: SUBMITTED } },
    examQuestion: {
      question: { type: { in: OPEN_TYPES } },
      section: {
        ...(skill ? { skill } : {}),
        ...(scope === 'MINE' ? { exam: { authorId: user.id } } : {}),
      },
    },
  } satisfies Prisma.AttemptAnswerWhereInput;
}

/** Chờ chấm: giáo viên chưa chấm, và AI chấm lỗi hoặc học viên đã yêu cầu */
const WAITING_WHERE = {
  assessments: { none: TEACHER_DONE },
  OR: [
    { assessments: { some: { grader: Grader.AI, status: AssessmentStatus.FAILED } } },
    { reviewRequestedAt: { not: null } },
  ],
} satisfies Prisma.AttemptAnswerWhereInput;

/**
 * Câu để chấm đối chiếu: AI đã chấm xong, chưa giáo viên nào chấm, còn bài làm để chấm (bài nói đã
 * tự xóa thì không nghe được nên bỏ qua)
 */
const CALIBRATION_WHERE = {
  assessments: {
    some: { grader: Grader.AI, status: AssessmentStatus.DONE },
    none: { grader: Grader.TEACHER },
  },
  OR: [{ textAnswer: { not: null } }, { audioKey: { not: null } }],
} satisfies Prisma.AttemptAnswerWhereInput;

/** Số cặp điểm tối đa trả về trang độ lệch (đủ cho bộ 20–30 bài và xuất CSV) */
const MAX_PAIRS = 1000;

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Chỉ số độ lệch của một nhóm cặp điểm (điểm, và quy về % thang để so giữa các Part) */
export function agreementRow(
  pairs: Pick<AgreementPair, 'aiScore' | 'teacherScore' | 'maxScore'>[],
  skill: Skill | null = null,
  part: number | null = null,
): AgreementRow {
  const count = pairs.length;
  const mean = (pick: (pair: (typeof pairs)[number]) => number) =>
    count ? pairs.reduce((sum, pair) => sum + pick(pair), 0) / count : 0;
  return {
    skill,
    part,
    count,
    mae: round(
      mean((p) => Math.abs(p.aiScore - p.teacherScore)),
      2,
    ),
    maePercent: round(mean((p) => (Math.abs(p.aiScore - p.teacherScore) / p.maxScore) * 100)),
    biasPercent: round(mean((p) => ((p.aiScore - p.teacherScore) / p.maxScore) * 100)),
    exactRate: round(mean((p) => (p.aiScore === p.teacherScore ? 100 : 0))),
    withinOneRate: round(mean((p) => (Math.abs(p.aiScore - p.teacherScore) <= 1 ? 100 : 0))),
    aiMeanPercent: round(mean((p) => (p.aiScore / p.maxScore) * 100)),
    teacherMeanPercent: round(mean((p) => (p.teacherScore / p.maxScore) * 100)),
  };
}

function criteriaOptions(skill: Skill): ReviewCriterionOption[] {
  const list = skill === Skill.SPEAKING ? SPEAKING_CRITERIA : WRITING_CRITERIA;
  return list.map(({ key, label }) => ({ key, label }));
}

function subScoreOptions(skill: Skill, part: number): ReviewSubScoreOption[] {
  return skill === Skill.SPEAKING && part === 1
    ? READ_ALOUD_SUB_SCORES.map(({ key, label, max }) => ({ key, label, max }))
    : [];
}

/**
 * Giáo viên xem lại và sửa điểm AI chấm Speaking/Writing (SPRINT-91). Mọi giáo viên chấm được mọi
 * đề (tổ chấm chung, lọc "đề của tôi" khi cần); học viên hiện bằng mã ẩn danh. Bản giáo viên là
 * điểm chính thức, bản AI giữ lại để đối chiếu; mỗi câu chỉ một bản giáo viên, sửa có khóa lạc quan
 */
@Injectable()
export class TeacherAssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: AttemptScoringService,
    private readonly media: MediaUrlService,
    private readonly notifications: AttemptNotificationsService,
  ) {}

  async list(
    user: AuthUser,
    query: TeacherAssessmentQueryDto,
  ): Promise<WithMeta<TeacherReviewItem[]>> {
    const where: Prisma.AttemptAnswerWhereInput = {
      ...openAnswerWhere(user, query.scope, query.skill),
      ...(query.tab === 'WAITING' ? WAITING_WHERE : { assessments: { some: TEACHER_DONE } }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.attemptAnswer.findMany({
        where,
        select: itemSelect,
        // Chờ chấm: bài nộp lâu nhất trước; đã chấm: mới nhất trước
        orderBy: [
          { attempt: { submittedAt: query.tab === 'WAITING' ? 'asc' : 'desc' } },
          { id: 'asc' },
        ],
        ...toPrismaPage(query),
      }),
      this.prisma.attemptAnswer.count({ where }),
    ]);
    return paginate(
      rows.map((row) => this.toItem(row, user)),
      total,
      query,
    );
  }

  /** blind: chấm đối chiếu, ẩn bản AI khi giáo viên chưa chấm câu này */
  async detail(answerId: string, user: AuthUser, blind = false): Promise<TeacherReviewDetail> {
    const row = await this.prisma.attemptAnswer.findFirst({
      where: { id: answerId, ...openAnswerWhere(user, 'ALL') },
      select: detailSelect,
    });
    if (!row) throw new AppException(ErrorCode.ASSESSMENT_NOT_FOUND);
    return this.toDetail(row, user, blind);
  }

  /** Chọn ngẫu nhiên một câu AI đã chấm, chưa giáo viên nào chấm, để chấm đối chiếu */
  async nextCalibration(user: AuthUser, query: CalibrationQueryDto): Promise<CalibrationSample> {
    const where: Prisma.AttemptAnswerWhereInput = {
      ...openAnswerWhere(user, query.scope, query.skill),
      ...CALIBRATION_WHERE,
    };
    const remaining = await this.prisma.attemptAnswer.count({ where });
    if (remaining === 0) return { answerId: null, remaining };
    const [row] = await this.prisma.attemptAnswer.findMany({
      where,
      select: { id: true },
      orderBy: { id: 'asc' },
      skip: Math.floor(Math.random() * remaining),
      take: 1,
    });
    return { answerId: row?.id ?? null, remaining };
  }

  /**
   * Độ lệch điểm AI so với giáo viên (SPRINT-90) trên các câu có cả hai bản đã chấm xong. Mặc định
   * chỉ tính câu chấm đối chiếu (giáo viên không thấy điểm AI) để mẫu không bị lệch
   */
  async agreement(user: AuthUser, query: AgreementQueryDto): Promise<AgreementStats> {
    const rows = await this.prisma.attemptAnswer.findMany({
      where: {
        ...openAnswerWhere(user, query.scope),
        AND: [
          { assessments: { some: { grader: Grader.AI, status: AssessmentStatus.DONE } } },
          {
            assessments: {
              some: {
                ...TEACHER_DONE,
                ...(query.sample === 'BLIND' ? { blindReview: true } : {}),
              },
            },
          },
        ],
      },
      select: itemSelect,
    });
    const pairs: AgreementPair[] = [];
    for (const row of rows) {
      const ai = row.assessments.find((item) => item.grader === Grader.AI);
      const teacher = row.assessments.find((item) => item.grader === Grader.TEACHER);
      if (!ai || !teacher) continue;
      const { skill, part } = row.examQuestion.section;
      const aiScore = Number(ai.score);
      const teacherScore = Number(teacher.score);
      pairs.push({
        answerId: row.id,
        examTitle: row.attempt.exam.title,
        skill,
        part,
        questionNumber: row.examQuestion.orderIndex + 1,
        aiScore,
        teacherScore,
        maxScore: Number(teacher.maxScore),
        diff: aiScore - teacherScore,
        blindReview: teacher.blindReview,
        reviewerName: teacher.reviewer?.fullName ?? null,
        reviewedAt: teacher.gradedAt,
      });
    }

    const groups = new Map<string, AgreementPair[]>();
    const bySkill = new Map<Skill, AgreementPair[]>();
    for (const pair of pairs) {
      const key = `${pair.skill}:${pair.part}`;
      groups.set(key, [...(groups.get(key) ?? []), pair]);
      bySkill.set(pair.skill, [...(bySkill.get(pair.skill) ?? []), pair]);
    }
    const skillOrder = (skill: Skill | null) => (skill === Skill.SPEAKING ? 0 : 1);
    return {
      overall: agreementRow(pairs),
      bySkill: [...bySkill.entries()]
        .map(([skill, list]) => agreementRow(list, skill))
        .sort((a, b) => skillOrder(a.skill) - skillOrder(b.skill)),
      byPart: [...groups.values()]
        .map((list) => agreementRow(list, list[0].skill, list[0].part))
        .sort((a, b) => skillOrder(a.skill) - skillOrder(b.skill) || (a.part ?? 0) - (b.part ?? 0)),
      pairs: pairs
        .sort((a, b) => Math.abs(b.diff) / b.maxScore - Math.abs(a.diff) / a.maxScore)
        .slice(0, MAX_PAIRS),
    };
  }

  /** Chấm hoặc sửa bản đã chấm; tính lại điểm bài làm và báo cho học viên */
  async grade(answerId: string, user: AuthUser, dto: GradeAnswerDto): Promise<TeacherReviewDetail> {
    const row = await this.prisma.attemptAnswer.findFirst({
      where: { id: answerId, ...openAnswerWhere(user, 'ALL') },
      select: detailSelect,
    });
    if (!row) throw new AppException(ErrorCode.ASSESSMENT_NOT_FOUND);

    const { skill, part } = row.examQuestion.section;
    const maxScore = openMaxScore(skill, part);
    const subScores = subScoreOptions(skill, part).length > 0 ? dto.subScores : undefined;
    if (subScoreOptions(skill, part).length > 0 && !subScores) {
      throw new AppException(
        ErrorCode.ASSESSMENT_SCORE_OUT_OF_RANGE,
        'Speaking Part 1 chấm 2 điểm con: phát âm và ngữ điệu (0–3)',
      );
    }
    const score = subScores ? subScores.pronunciation + subScores.intonation : dto.score;
    if (score === undefined || score > maxScore) {
      throw new AppException(
        ErrorCode.ASSESSMENT_SCORE_OUT_OF_RANGE,
        `Điểm câu này từ 0 đến ${maxScore}`,
      );
    }
    const criteria = this.checkCriteria(skill, dto.criteria ?? {});

    const data = {
      status: AssessmentStatus.DONE,
      score,
      maxScore,
      criteria: (subScores
        ? { ...criteria, subScores: { ...subScores } }
        : criteria) as Prisma.InputJsonValue,
      feedback: dto.feedback,
      reviewedBy: user.id,
      gradedAt: new Date(),
    };
    const existing = row.assessments.find((item) => item.grader === Grader.TEACHER);
    if (existing) {
      // Khóa lạc quan: giáo viên khác vừa sửa thì báo, không ghi đè
      const { count } = await this.prisma.answerAssessment.updateMany({
        where: {
          id: existing.id,
          updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(0),
        },
        // Sửa lại sau khi đã thấy điểm AI: không còn là mẫu chấm đối chiếu
        data: { ...data, blindReview: false },
      });
      if (count === 0) throw this.conflict(existing.reviewer?.fullName);
    } else {
      try {
        await this.prisma.answerAssessment.create({
          data: {
            ...data,
            attemptAnswerId: row.id,
            grader: Grader.TEACHER,
            blindReview: dto.blind === true,
          },
        });
      } catch (error) {
        // Giáo viên khác vừa chấm cùng câu (unique attempt_answer_id + grader)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw this.conflict();
        }
        throw error;
      }
    }

    const attemptId = row.attempt.id;
    await this.scoring.refresh(attemptId);
    await this.notifications.teacherReviewed(attemptId, { skill, part, score, maxScore });
    return this.detail(answerId, user);
  }

  /** Chỉ nhận tiêu chí của kỹ năng, điểm nguyên 0–5 */
  private checkCriteria(skill: Skill, input: Record<string, number>): Record<string, number> {
    const allowed = new Set(criteriaOptions(skill).map((item) => item.key));
    for (const [key, value] of Object.entries(input)) {
      if (!allowed.has(key) || !Number.isInteger(value) || value < 0 || value > 5) {
        throw new AppException(
          ErrorCode.ASSESSMENT_SCORE_OUT_OF_RANGE,
          `Tiêu chí "${key}" không hợp lệ (điểm nguyên 0–5)`,
        );
      }
    }
    return { ...input };
  }

  private conflict(reviewerName?: string | null): AppException {
    return new AppException(
      ErrorCode.VERSION_CONFLICT,
      `${reviewerName ? `Giáo viên ${reviewerName}` : 'Giáo viên khác'} vừa chấm câu này, vui lòng tải lại để xem điểm mới`,
    );
  }

  private toItem(row: ItemRow, user: AuthUser): TeacherReviewItem {
    const ai = row.assessments.find((item) => item.grader === Grader.AI);
    const teacher = row.assessments.find(
      (item) => item.grader === Grader.TEACHER && item.status === AssessmentStatus.DONE,
    );
    const { skill, part } = row.examQuestion.section;
    const reasons: ReviewReason[] = [];
    if (ai?.status === AssessmentStatus.FAILED) reasons.push(ReviewReason.AI_FAILED);
    if (row.reviewRequestedAt) reasons.push(ReviewReason.STUDENT_REQUEST);
    return {
      answerId: row.id,
      examTitle: row.attempt.exam.title,
      isMyExam: row.attempt.exam.authorId === user.id,
      skill,
      part,
      questionNumber: row.examQuestion.orderIndex + 1,
      studentCode: studentCode(row.attempt.studentId),
      submittedAt: row.attempt.submittedAt as Date,
      reasons,
      requestNote: row.reviewRequestNote,
      aiStatus: ai?.status ?? null,
      aiScore: ai?.score == null ? null : Number(ai.score),
      maxScore: openMaxScore(skill, part),
      teacherScore: teacher?.score == null ? null : Number(teacher.score),
      reviewerName: teacher?.reviewer?.fullName ?? null,
      reviewedAt: teacher?.gradedAt ?? null,
      blindReview: teacher?.blindReview ?? false,
    };
  }

  private toDetail(row: DetailRow, user: AuthUser, blind: boolean): TeacherReviewDetail {
    const { question, section } = row.examQuestion;
    const teacher = row.assessments.find((item) => item.grader === Grader.TEACHER);
    // Chấm đối chiếu: ẩn bản AI tới khi giáo viên lưu (đã chấm rồi thì hiện bình thường)
    const hidden = blind && !teacher;
    const ai = hidden ? undefined : row.assessments.find((item) => item.grader === Grader.AI);
    return {
      ...this.toItem(row, user),
      ...(hidden ? { aiStatus: null, aiScore: null } : {}),
      blind: hidden,
      question: {
        type: question.type,
        content: question.content,
        imageUrl: this.media.questionMediaUrl(question.imageKey),
        passage: question.group?.passage ?? null,
        groupImageUrl: this.media.questionMediaUrl(question.group?.imageKey ?? null),
        sampleAnswer: question.sampleAnswer,
        responseSeconds: question.responseSeconds,
      },
      answer: {
        textAnswer: row.textAnswer,
        recordingUrl: this.media.recordingUrl(row.audioKey),
        recordingDeletedAt: row.audioDeletedAt,
      },
      reviewRequest: toReviewRequest(row),
      aiAssessment: ai ? toQuestionAssessment(ai) : null,
      teacherAssessment: teacher ? toQuestionAssessment(teacher) : null,
      criteriaOptions: criteriaOptions(section.skill),
      subScoreOptions: subScoreOptions(section.skill, section.part),
    };
  }
}
