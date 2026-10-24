import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AttemptMode, AttemptStatus, ExamKind, ExamStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { toExamPaper, type ExamPaperRow } from '../exams/exams.mapper.js';
import { PaperCacheService, type PaperTarget } from '../exams/paper-cache.service.js';
import { MediaUrlService } from '../media/media-url.service.js';
import { AttemptSubmissionService, resultSelect, toResult } from './attempt-submission.service.js';
import { findPartRule } from '../questions/toeic-parts.js';
import {
  ANSWER_GRACE_SECONDS,
  answerProblem,
  answerWrite,
  clampAnsweredAt,
  expiresAtFor,
  remainingSeconds,
  SYNC_GRACE_SECONDS,
  withinDeadline,
  type AnswerInput,
} from './attempt-rules.js';
import type {
  AttemptAnswerItem,
  AttemptDetail,
  AttemptResult,
  AttemptSummary,
  InProgressAttempt,
  SaveAnswerResult,
  SyncAnswersResult,
} from './attempts.types.js';
import type { SaveAnswerDto, StartAttemptDto, SyncAnswersDto } from './dto/attempt.dto.js';

export const attemptSelect = {
  id: true,
  examId: true,
  sectionId: true,
  mode: true,
  status: true,
  startedAt: true,
  expiresAt: true,
  submittedAt: true,
  exam: { select: { id: true, title: true, scoringScale: true, durationMinutes: true } },
  section: { select: { id: true, skill: true, part: true } },
} satisfies Prisma.ExamAttemptSelect;

const answerSelect = {
  examQuestionId: true,
  selectedOptionId: true,
  textAnswer: true,
  isFlagged: true,
  answeredAt: true,
} satisfies Prisma.AttemptAnswerSelect;

export type AttemptRow = Prisma.ExamAttemptGetPayload<{ select: typeof attemptSelect }>;
type Db = Prisma.TransactionClient | PrismaService;

/** Khôi phục bài: thông tin bài làm và kết quả trong một lần đọc */
const detailSelect = {
  ...attemptSelect,
  ...resultSelect,
  exam: { select: { ...attemptSelect.exam.select, ...resultSelect.exam.select } },
} satisfies Prisma.ExamAttemptSelect;

type DetailRow = Prisma.ExamAttemptGetPayload<{ select: typeof detailSelect }>;

/** Tự động lưu chỉ cần các cột này: một truy vấn, không nạp đề, Part */
const answerAttemptSelect = {
  id: true,
  examId: true,
  sectionId: true,
  status: true,
  startedAt: true,
  expiresAt: true,
} satisfies Prisma.ExamAttemptSelect;

type AnswerAttempt = Prisma.ExamAttemptGetPayload<{ select: typeof answerAttemptSelect }>;

export function toSummary(row: AttemptRow, now: Date): AttemptSummary {
  const { section } = row;
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    startedAt: row.startedAt,
    expiresAt: row.expiresAt,
    submittedAt: row.submittedAt,
    remainingSeconds: remainingSeconds(row.expiresAt, now),
    serverTime: now,
    exam: row.exam,
    section: section && {
      ...section,
      name: findPartRule(section.skill, section.part)?.name ?? `Part ${section.part}`,
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Lượt làm bài của học viên (Ke_hoach_trien_khai Mục 7.2, SPRINT-51). Bài của người khác coi như
 * không tồn tại (404). Đồng hồ tính ở server từ expires_at; nộp bài và chấm điểm ở SPRINT-52.
 */
@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaUrlService,
    private readonly submission: AttemptSubmissionService,
    private readonly papers: PaperCacheService,
  ) {}

  /** Nộp bài: chấm phần trắc nghiệm; gọi lại sau khi đã nộp thì trả kết quả cũ */
  submit(id: string, user: AuthUser): Promise<AttemptResult> {
    return this.submission.submit(id, user.id);
  }

  /**
   * Quá hạn nộp + thời gian ân hạn mà job tự nộp chưa tới lượt: nộp luôn khi học viên mở lại bài,
   * để không bao giờ trả về một bài "đang làm" mà thực ra đã hết giờ
   */
  private async submitIfOverdue(row: AttemptRow, now: Date): Promise<boolean> {
    if (
      row.status !== AttemptStatus.IN_PROGRESS ||
      withinDeadline(row.expiresAt, now, SYNC_GRACE_SECONDS)
    ) {
      return false;
    }
    await this.submission.submit(row.id);
    return true;
  }

  async start(examId: string, dto: StartAttemptDto, user: AuthUser): Promise<AttemptDetail> {
    // Đề lấy từ cache (giáo viên gỡ, sửa đề thì cache bị xóa ngay): 200 học viên bấm "Bắt đầu"
    // cùng lúc chỉ đọc đề một lần
    const cached = await this.papers.get(examId);
    if (
      !cached ||
      cached.exam.status !== ExamStatus.PUBLISHED ||
      cached.exam.deletedAt !== null ||
      cached.exam.kind !== ExamKind.STANDARD
    ) {
      throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    }
    const { exam, paper } = cached;

    let sectionId: string | null = null;
    if (dto.mode === AttemptMode.PART) {
      if (!exam.allowPartPractice) throw new AppException(ErrorCode.ATTEMPT_PART_PRACTICE_DISABLED);
      if (!dto.sectionId) throw fieldError('sectionId', 'Chọn Part muốn luyện');
      if (!paper.sections.some((section) => section.id === dto.sectionId)) {
        throw new AppException(ErrorCode.EXAM_SECTION_NOT_FOUND);
      }
      sectionId = dto.sectionId;
    } else if (dto.sectionId) {
      throw fieldError('sectionId', 'Làm cả đề thì không chọn Part');
    }

    // Đang có bài dở: cùng kiểu (cả đề / cùng Part) thì làm tiếp, khác kiểu thì hỏi học viên
    const current = await this.prisma.examAttempt.findFirst({
      where: { studentId: user.id, examId, status: AttemptStatus.IN_PROGRESS },
      select: { id: true, mode: true, sectionId: true },
    });
    if (current) {
      if (current.mode === dto.mode && current.sectionId === sectionId) {
        return this.detail(current.id, user, true);
      }
      throw new AppException(ErrorCode.ATTEMPT_IN_PROGRESS, undefined, {
        attemptId: current.id,
        mode: current.mode,
        sectionId: current.sectionId,
      });
    }

    // Giới hạn số lượt chỉ tính lượt làm cả đề chưa hủy
    if (dto.mode === AttemptMode.FULL && exam.maxAttempts !== null) {
      const used = await this.prisma.examAttempt.count({
        where: {
          studentId: user.id,
          examId,
          mode: AttemptMode.FULL,
          status: { not: AttemptStatus.CANCELLED },
        },
      });
      if (used >= exam.maxAttempts) throw new AppException(ErrorCode.ATTEMPT_LIMIT_REACHED);
    }

    const now = new Date();
    try {
      const created = await this.prisma.examAttempt.create({
        data: {
          studentId: user.id,
          examId,
          mode: dto.mode,
          sectionId,
          startedAt: now,
          expiresAt: expiresAtFor(dto.mode, paper.durationMinutes, now),
        },
        select: detailSelect,
      });
      // Bài mới chưa có câu trả lời: trả luôn, không đọc lại bài vừa tạo
      return this.toDetail(created, paper, [], false);
    } catch (error) {
      // Bấm "Bắt đầu" hai lần cùng lúc: uq_attempts_one_in_progress chặn lượt thứ hai → trả lượt đầu
      if (!isUniqueViolation(error)) throw error;
      const other = await this.prisma.examAttempt.findFirst({
        where: { studentId: user.id, examId, status: AttemptStatus.IN_PROGRESS },
        select: { id: true },
      });
      if (!other) throw error;
      return this.detail(other.id, user, true);
    }
  }

  /** Khôi phục bài: đề (không đáp án) + câu đã trả lời + thời gian còn lại */
  async detail(id: string, user: AuthUser, resumed = false): Promise<AttemptDetail> {
    const load = async () => {
      const found = await this.prisma.examAttempt.findFirst({
        where: { id, studentId: user.id },
        select: detailSelect,
      });
      if (!found) throw new AppException(ErrorCode.ATTEMPT_NOT_FOUND);
      return found;
    };
    let row = await load();
    if (await this.submitIfOverdue(row, new Date())) row = await load();

    // Đề lấy từ cache: mọi học viên làm cùng đề dùng chung một lần đọc DB
    const [cached, answers] = await Promise.all([
      this.papers.get(row.examId),
      this.prisma.attemptAnswer.findMany({ where: { attemptId: id }, select: answerSelect }),
    ]);
    if (!cached) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    return this.toDetail(row, cached.paper, answers, resumed);
  }

  private toDetail(
    row: DetailRow,
    paper: ExamPaperRow,
    answers: AttemptAnswerItem[],
    resumed: boolean,
  ): AttemptDetail {
    return {
      ...toSummary(row, new Date()),
      resumed,
      result: toResult(row),
      // Luyện theo Part: chỉ đưa Part đó, câu đánh số lại từ 1
      paper: toExamPaper(
        row.sectionId
          ? { ...paper, sections: paper.sections.filter((section) => section.id === row.sectionId) }
          : paper,
        this.media,
      ),
      answers,
    };
  }

  async listInProgress(user: AuthUser): Promise<InProgressAttempt[]> {
    const rows = await this.prisma.examAttempt.findMany({
      where: { studentId: user.id, status: AttemptStatus.IN_PROGRESS },
      orderBy: { startedAt: 'desc' },
      select: {
        ...attemptSelect,
        exam: {
          select: {
            ...attemptSelect.exam.select,
            sections: { select: { id: true, _count: { select: { questions: true } } } },
          },
        },
        // Câu "đã làm": đã chọn phương án hoặc đã viết (chỉ đánh dấu thì chưa tính)
        _count: {
          select: {
            answers: {
              where: { OR: [{ selectedOptionId: { not: null } }, { textAnswer: { not: null } }] },
            },
          },
        },
      },
    });

    const now = new Date();
    // Bài đã quá hạn mà job chưa tự nộp: nộp ngay và không đưa vào danh sách "làm tiếp"
    const active = [];
    for (const row of rows) {
      if (!(await this.submitIfOverdue({ ...row, exam: row.exam }, now))) active.push(row);
    }
    return active.map(({ _count, exam: { sections, ...exam }, ...row }) => ({
      ...toSummary({ ...row, exam }, now),
      answeredCount: _count.answers,
      totalQuestions: sections
        .filter((section) => !row.sectionId || section.id === row.sectionId)
        .reduce((sum, section) => sum + section._count.questions, 0),
    }));
  }

  /** Tự động lưu một câu (idempotent): gửi lại cùng nội dung bao nhiêu lần cũng cho cùng kết quả */
  async saveAnswer(
    id: string,
    examQuestionId: string,
    dto: SaveAnswerDto,
    user: AuthUser,
  ): Promise<SaveAnswerResult> {
    const attempt = await this.loadForAnswer(id, user);
    this.assertInProgress(attempt);
    const now = new Date();
    if (!withinDeadline(attempt.expiresAt, now, ANSWER_GRACE_SECONDS)) {
      throw new AppException(ErrorCode.ATTEMPT_EXPIRED);
    }

    const targets = await this.targets(attempt, [examQuestionId]);
    const target = targets.get(examQuestionId);
    if (!target) throw new AppException(ErrorCode.ATTEMPT_QUESTION_NOT_FOUND);
    const problem = answerProblem(target, dto);
    if (problem) throw fieldError(problem.field, problem.message);

    const answeredAt = clampAnsweredAt(dto.answeredAt, attempt.startedAt, now);
    const result = await this.upsertAnswer(this.prisma, id, examQuestionId, dto, answeredAt);
    return { ...result, remainingSeconds: remainingSeconds(attempt.expiresAt, now) };
  }

  /**
   * Đồng bộ lô sau mất mạng. Kiểm tra cả lô trước khi ghi (một câu sai thì không ghi câu nào),
   * ghi theo thứ tự answeredAt tăng dần trong một transaction; câu trả lời sau hạn nộp bị bỏ qua
   */
  async syncAnswers(id: string, dto: SyncAnswersDto, user: AuthUser): Promise<SyncAnswersResult> {
    const attempt = await this.loadForAnswer(id, user);
    this.assertInProgress(attempt);
    const now = new Date();
    if (!withinDeadline(attempt.expiresAt, now, SYNC_GRACE_SECONDS)) {
      throw new AppException(ErrorCode.ATTEMPT_EXPIRED);
    }

    const targets = await this.targets(
      attempt,
      dto.answers.map((item) => item.examQuestionId),
    );
    dto.answers.forEach((item, index) => {
      const target = targets.get(item.examQuestionId);
      if (!target) {
        throw fieldError(`answers[${index}].examQuestionId`, 'Câu hỏi không thuộc bài làm này');
      }
      const problem = answerProblem(target, item);
      if (problem) throw fieldError(`answers[${index}].${problem.field}`, problem.message);
    });

    const items = dto.answers
      .map((item) => ({
        item,
        answeredAt: clampAnsweredAt(item.answeredAt, attempt.startedAt, now),
      }))
      .sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime());

    const counts = await this.prisma.$transaction(
      async (tx) => {
        let applied = 0;
        let ignored = 0;
        for (const { item, answeredAt } of items) {
          if (attempt.expiresAt && answeredAt > attempt.expiresAt) {
            ignored++;
            continue;
          }
          const result = await this.upsertAnswer(tx, id, item.examQuestionId, item, answeredAt);
          if (result.applied) applied++;
          else ignored++;
        }
        return { applied, ignored };
      },
      { timeout: 30_000 },
    );

    return { ...counts, remainingSeconds: remainingSeconds(attempt.expiresAt, now) };
  }

  /** Hủy bài đang làm để làm lại; lượt đã hủy không tính vào giới hạn số lượt */
  async cancel(id: string, user: AuthUser): Promise<void> {
    const { count } = await this.prisma.examAttempt.updateMany({
      where: { id, studentId: user.id, status: AttemptStatus.IN_PROGRESS },
      data: { status: AttemptStatus.CANCELLED },
    });
    if (count > 0) return;
    await this.loadOwned(id, user); // không phải bài của mình → 404
    throw new AppException(ErrorCode.ATTEMPT_NOT_IN_PROGRESS);
  }

  private async loadOwned(id: string, user: AuthUser): Promise<AttemptRow> {
    const row = await this.prisma.examAttempt.findFirst({
      where: { id, studentId: user.id },
      select: attemptSelect,
    });
    if (!row) throw new AppException(ErrorCode.ATTEMPT_NOT_FOUND);
    return row;
  }

  /** Tự động lưu được gọi mỗi lần chọn đáp án: chỉ đọc các cột cần, không kèm đề, Part */
  private async loadForAnswer(id: string, user: AuthUser): Promise<AnswerAttempt> {
    const row = await this.prisma.examAttempt.findFirst({
      where: { id, studentId: user.id },
      select: answerAttemptSelect,
    });
    if (!row) throw new AppException(ErrorCode.ATTEMPT_NOT_FOUND);
    return row;
  }

  private assertInProgress(attempt: Pick<AttemptRow, 'status'>): void {
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new AppException(ErrorCode.ATTEMPT_NOT_IN_PROGRESS);
    }
  }

  /**
   * Câu trong phạm vi bài làm (cả đề, hoặc chỉ Part đang luyện) kèm loại câu và id phương án; lấy
   * từ cache đề nên tự động lưu không phải truy vấn câu hỏi
   */
  private async targets(
    attempt: AnswerAttempt,
    examQuestionIds: string[],
  ): Promise<Map<string, PaperTarget>> {
    const cached = await this.papers.get(attempt.examId);
    const result = new Map<string, PaperTarget>();
    for (const examQuestionId of examQuestionIds) {
      const target = cached?.targets.get(examQuestionId);
      if (target && (!attempt.sectionId || target.sectionId === attempt.sectionId)) {
        result.set(examQuestionId, target);
      }
    }
    return result;
  }

  /**
   * Ghi câu trả lời bằng một câu SQL: chưa có thì thêm, đã có thì ghi đè các trường gửi lên, nhưng
   * chỉ khi bản gửi lên mới hơn bản đã lưu (so answeredAt). Gửi lại một yêu cầu cũ (mạng chập chờn,
   * đồng bộ lô) không làm mất câu trả lời mới hơn; hai yêu cầu đầu tiên của cùng một câu đến cùng lúc
   * cũng an toàn nhờ ON CONFLICT (uq_attempt_answers_attempt_question)
   */
  private async upsertAnswer(
    db: Db,
    attemptId: string,
    examQuestionId: string,
    input: AnswerInput,
    answeredAt: Date,
  ): Promise<{ answer: AttemptAnswerItem; applied: boolean }> {
    const { values, overwrite } = answerWrite(input);
    const [answer] = await db.$queryRaw<AttemptAnswerItem[]>`
      INSERT INTO attempt_answers AS a
        (attempt_id, exam_question_id, selected_option_id, text_answer, is_flagged, answered_at, updated_at)
      VALUES (${attemptId}::uuid, ${examQuestionId}::uuid, ${values.selectedOptionId}::uuid,
        ${values.textAnswer}, ${values.isFlagged}, ${answeredAt}, now())
      ON CONFLICT (attempt_id, exam_question_id) DO UPDATE SET
        selected_option_id = CASE WHEN ${overwrite.selectedOptionId}
          THEN EXCLUDED.selected_option_id ELSE a.selected_option_id END,
        text_answer = CASE WHEN ${overwrite.textAnswer}
          THEN EXCLUDED.text_answer ELSE a.text_answer END,
        is_flagged = CASE WHEN ${overwrite.isFlagged} THEN EXCLUDED.is_flagged ELSE a.is_flagged END,
        answered_at = EXCLUDED.answered_at,
        updated_at = now()
      WHERE a.answered_at <= EXCLUDED.answered_at
      RETURNING exam_question_id AS "examQuestionId", selected_option_id AS "selectedOptionId",
        text_answer AS "textAnswer", is_flagged AS "isFlagged", answered_at AS "answeredAt"`;
    if (answer) return { answer, applied: true };

    // Bản đã lưu mới hơn: giữ nguyên và trả lại bản đó
    const existing = await db.attemptAnswer.findUniqueOrThrow({
      where: { attemptId_examQuestionId: { attemptId, examQuestionId } },
      select: answerSelect,
    });
    return { answer: existing, applied: false };
  }
}
