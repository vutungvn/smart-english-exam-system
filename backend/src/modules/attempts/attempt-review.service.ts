import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { WithMeta } from '../../common/types/api-response.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AttemptStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  AssessmentsService,
  assessmentViewSelect,
  effectiveAssessment,
  toQuestionAssessment,
} from '../assessments/assessments.service.js';
import { MediaUrlService } from '../media/media-url.service.js';
import { findPartRule } from '../questions/toeic-parts.js';
import { SYNC_GRACE_SECONDS, withinDeadline } from './attempt-rules.js';
import { AttemptSubmissionService, resultSelect, toResult } from './attempt-submission.service.js';
import { attemptSelect, toSummary } from './attempts.service.js';
import type {
  AttemptHistoryItem,
  AttemptResult,
  AttemptReview,
  ReviewBlock,
  ReviewQuestion,
  ReviewSection,
} from './attempts.types.js';
import type { AttemptHistoryQueryDto } from './dto/attempt.dto.js';
import { shuffleSections } from './paper-shuffle.js';
import { addOutcome, durationOf, emptyCounts, reviewOutcome } from './review-outcome.js';

/** Bài làm kèm các cột kết quả */
const reviewAttemptSelect = {
  ...attemptSelect,
  ...resultSelect,
  exam: { select: { ...attemptSelect.exam.select, ...resultSelect.exam.select } },
} satisfies Prisma.ExamAttemptSelect;

/** Đề như lúc làm bài, thêm đáp án đúng, giải thích, câu trả lời mẫu, lời thoại */
const reviewPaperSelect = {
  shuffleQuestions: true,
  sections: {
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      skill: true,
      part: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          question: {
            select: {
              type: true,
              content: true,
              audioKey: true,
              imageKey: true,
              prepSeconds: true,
              responseSeconds: true,
              explanation: true,
              sampleAnswer: true,
              options: {
                orderBy: { orderIndex: 'asc' },
                select: { id: true, label: true, content: true, isCorrect: true },
              },
              group: {
                select: {
                  id: true,
                  passage: true,
                  transcript: true,
                  audioKey: true,
                  imageKey: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ExamSelect;

const SUBMITTED = [AttemptStatus.SUBMITTED, AttemptStatus.GRADED];

/** Hệ thống tự nộp khi hết giờ: nộp lúc (hoặc sau) hạn, cùng mốc 2 giây với trang kết quả FE */
function isAutoSubmitted(expiresAt: Date | null, submittedAt: Date): boolean {
  return !!expiresAt && submittedAt.getTime() >= expiresAt.getTime() - 2000;
}

/**
 * Xem lại bài đã nộp và lịch sử làm bài (Thiet_ke_API Mục 3.9, SPRINT-53). Chỉ chủ bài làm xem được;
 * đáp án mở ngay sau khi nộp. Nội dung câu hỏi lấy theo bản hiện tại trong ngân hàng (phương án đã
 * có người chọn không xóa được nên lựa chọn của học viên luôn còn).
 */
@Injectable()
export class AttemptReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaUrlService,
    private readonly submission: AttemptSubmissionService,
    private readonly assessments: AssessmentsService,
  ) {}

  async review(id: string, user: AuthUser): Promise<AttemptReview> {
    let row = await this.load(id, user);
    // Đã quá hạn mà job tự nộp chưa tới lượt: nộp luôn rồi cho xem
    if (
      row.status === AttemptStatus.IN_PROGRESS &&
      !withinDeadline(row.expiresAt, new Date(), SYNC_GRACE_SECONDS)
    ) {
      await this.submission.submit(id);
      row = await this.load(id, user);
    }
    const result = toResult(row, await this.assessments.progress(id));
    if (!result) {
      throw new AppException(
        ErrorCode.ATTEMPT_NOT_SUBMITTED,
        row.status === AttemptStatus.CANCELLED
          ? 'Bài làm đã hủy, không có kết quả để xem lại'
          : undefined,
      );
    }

    const [paper, answers] = await Promise.all([
      this.prisma.exam.findUniqueOrThrow({ where: { id: row.examId }, select: reviewPaperSelect }),
      this.prisma.attemptAnswer.findMany({
        where: { attemptId: id },
        select: {
          examQuestionId: true,
          selectedOptionId: true,
          textAnswer: true,
          isFlagged: true,
          isCorrect: true,
          audioKey: true,
          audioDeletedAt: true,
          assessments: { select: assessmentViewSelect },
        },
      }),
    ]);
    const answerOf = new Map(answers.map((answer) => [answer.examQuestionId, answer]));

    // Luyện theo Part: chỉ Part đó, câu đánh số lại từ 1; đề bật đảo câu thì đúng thứ tự lúc làm bài
    // (cùng seed = id lượt làm bài, xem AttemptsService.toDetail)
    const scoped = row.sectionId
      ? paper.sections.filter((section) => section.id === row.sectionId)
      : paper.sections;
    const sections = paper.shuffleQuestions ? shuffleSections(scoped, id) : scoped;
    let number = 0;

    const reviewSections: ReviewSection[] = sections.map((section) => {
      const counts = emptyCounts();
      const blocks: ReviewBlock[] = [];

      for (const item of section.questions) {
        const { group, explanation, sampleAnswer, ...question } = item.question;
        const answer = answerOf.get(item.id);
        const correctOptionId = question.options.find((option) => option.isCorrect)?.id ?? null;
        const assessment = effectiveAssessment(answer?.assessments ?? []);
        const outcome = reviewOutcome(question.type, answer, correctOptionId, assessment?.status);
        addOutcome(counts, outcome);

        const reviewQuestion: ReviewQuestion = this.media.withUrls({
          ...question,
          number: ++number,
          examQuestionId: item.id,
          outcome,
          selectedOptionId: answer?.selectedOptionId ?? null,
          textAnswer: answer?.textAnswer ?? null,
          recordingUrl: this.media.recordingUrl(answer?.audioKey ?? null),
          recordingDeletedAt: answer?.audioDeletedAt ?? null,
          isFlagged: answer?.isFlagged ?? false,
          explanation,
          sampleAnswer,
          assessment: assessment ? toQuestionAssessment(assessment) : null,
        });

        // Các câu liền nhau cùng nhóm gom vào một khối (đoạn văn, lời thoại hiện một lần)
        const last = blocks.at(-1);
        if (group && last?.group?.id === group.id) last.questions.push(reviewQuestion);
        else
          blocks.push({ group: group && this.media.withUrls(group), questions: [reviewQuestion] });
      }

      return {
        id: section.id,
        skill: section.skill,
        part: section.part,
        name: findPartRule(section.skill, section.part)?.name ?? `Part ${section.part}`,
        counts,
        blocks,
      };
    });

    return {
      ...toSummary(row, new Date()),
      result,
      totalQuestions: number,
      sections: reviewSections,
    };
  }

  /** Bài đã nộp, mới nhất trước; bài đang làm, đã hủy không có trong lịch sử */
  async history(
    query: AttemptHistoryQueryDto,
    user: AuthUser,
  ): Promise<WithMeta<AttemptHistoryItem[]>> {
    const where = {
      studentId: user.id,
      status: { in: SUBMITTED },
      examId: query.examId,
      mode: query.mode,
    } satisfies Prisma.ExamAttemptWhereInput;
    const direction = query.sort === 'submittedAt:asc' ? 'asc' : 'desc';

    // Chỉ mục ix_exam_attempts_student_submitted (student_id, submitted_at DESC)
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.examAttempt.findMany({
        where,
        orderBy: [{ submittedAt: direction }, { id: direction }],
        select: reviewAttemptSelect,
        ...toPrismaPage(query),
      }),
      this.prisma.examAttempt.count({ where }),
    ]);

    const now = new Date();
    const items = rows.map((row): AttemptHistoryItem => {
      const result = toResult(row) as AttemptResult;
      const summary = toSummary(row, now);
      return {
        id: row.id,
        mode: row.mode,
        startedAt: row.startedAt,
        submittedAt: result.submittedAt,
        durationSeconds: durationOf(row.startedAt, result.submittedAt, row.expiresAt),
        autoSubmitted: isAutoSubmitted(row.expiresAt, result.submittedAt),
        exam: summary.exam,
        section: summary.section,
        result,
      };
    });
    return paginate(items, total, query);
  }

  private async load(id: string, user: AuthUser) {
    const row = await this.prisma.examAttempt.findFirst({
      where: { id, studentId: user.id },
      select: reviewAttemptSelect,
    });
    if (!row) throw new AppException(ErrorCode.ATTEMPT_NOT_FOUND);
    return row;
  }
}
