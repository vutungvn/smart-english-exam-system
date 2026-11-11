import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { InMemoryFile } from '../../common/types/in-memory-file.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  AttemptMode,
  AttemptStatus,
  ExamKind,
  ExamStatus,
  QuestionType,
  Skill,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { toExamPaper, type ExamPaperRow } from '../exams/exams.mapper.js';
import { PaperCacheService, type PaperTarget } from '../exams/paper-cache.service.js';
import { MediaUrlService } from '../media/media-url.service.js';
import { RECORDING_KEY_PREFIX } from '../media/media.constants.js';
import { AssessmentsService } from '../assessments/assessments.service.js';
import type { GradingProgress } from '../assessments/assessments.types.js';
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
import { shuffleSections } from './paper-shuffle.js';
import { recordingTooLong } from './recording-rules.js';
import { RecordingService } from './recording.service.js';
import type {
  AttemptAnswerItem,
  AttemptDetail,
  AttemptResult,
  AttemptSummary,
  InProgressAttempt,
  SaveAnswerResult,
  SaveRecordingResult,
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
  audioKey: true,
} satisfies Prisma.AttemptAnswerSelect;

type AnswerRow = Prisma.AttemptAnswerGetPayload<{ select: typeof answerSelect }>;

/** Không đưa key trong kho ra ngoài, chỉ báo câu Speaking đã có bài nói */
function toAnswerItem({ audioKey, ...answer }: AnswerRow): AttemptAnswerItem {
  return { ...answer, hasRecording: audioKey !== null };
}

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
    private readonly storage: StorageService,
    private readonly recordings: RecordingService,
    private readonly assessments: AssessmentsService,
  ) {}

  private readonly logger = new Logger(AttemptsService.name);

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

    // Giọng nói là dữ liệu cá nhân (D19): phần làm bài có Speaking cần học viên đồng ý ghi âm trước
    const hasSpeaking = paper.sections.some(
      (section) =>
        section.skill === Skill.SPEAKING && (sectionId === null || section.id === sectionId),
    );
    if (hasSpeaking) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
        select: { voiceConsentAt: true },
      });
      if (!student?.voiceConsentAt) throw new AppException(ErrorCode.VOICE_CONSENT_REQUIRED);
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
      return this.toDetail(created, paper, exam.shuffleQuestions, [], false);
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

    // Đề lấy từ cache: mọi học viên làm cùng đề dùng chung một lần đọc DB. Bài đã nộp: kèm tiến độ AI
    // chấm Speaking/Writing (trang kết quả hỏi lại định kỳ tới khi chấm xong)
    const [cached, answers, grading] = await Promise.all([
      this.papers.get(row.examId),
      this.prisma.attemptAnswer.findMany({ where: { attemptId: id }, select: answerSelect }),
      row.submittedAt ? this.assessments.progress(id) : null,
    ]);
    if (!cached) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    return this.toDetail(
      row,
      cached.paper,
      cached.exam.shuffleQuestions,
      answers.map(toAnswerItem),
      resumed,
      grading,
    );
  }

  private toDetail(
    row: DetailRow,
    paper: ExamPaperRow,
    shuffle: boolean,
    answers: AttemptAnswerItem[],
    resumed: boolean,
    grading: GradingProgress | null = null,
  ): AttemptDetail {
    // Luyện theo Part: chỉ đưa Part đó, câu đánh số lại từ 1
    const sections = row.sectionId
      ? paper.sections.filter((section) => section.id === row.sectionId)
      : paper.sections;
    return {
      ...toSummary(row, new Date()),
      resumed,
      result: toResult(row, grading),
      // Đề bật đảo câu: thứ tự riêng của lượt làm bài này (seed = id lượt), khớp với trang xem lại
      paper: toExamPaper(
        { ...paper, sections: shuffle ? shuffleSections(sections, row.id) : sections },
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
        // Câu "đã làm": đã chọn phương án, đã viết hoặc đã ghi âm (chỉ đánh dấu thì chưa tính)
        _count: {
          select: {
            answers: {
              where: {
                OR: [
                  { selectedOptionId: { not: null } },
                  { textAnswer: { not: null } },
                  { audioKey: { not: null } },
                ],
              },
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

  /**
   * Tải lên bài nói của một câu Speaking (SPRINT-88). Chuẩn hóa về MP3 rồi lưu kho tệp, ghi
   * audio_key; gửi lại (thử lại sau lỗi mạng, ghi âm lại) thì ghi đè và xóa tệp cũ. Nhận tới 2 phút
   * sau hạn như đồng bộ lô: bài nói được giữ trong IndexedDB và tải lên lại khi có mạng
   */
  async saveRecording(
    id: string,
    examQuestionId: string,
    file: InMemoryFile | undefined,
    user: AuthUser,
  ): Promise<SaveRecordingResult> {
    if (!file) throw fieldError('file', 'Chưa có tệp bài nói');
    const attempt = await this.loadForAnswer(id, user);
    this.assertInProgress(attempt);
    if (!withinDeadline(attempt.expiresAt, new Date(), SYNC_GRACE_SECONDS)) {
      throw new AppException(ErrorCode.ATTEMPT_EXPIRED);
    }

    const target = (await this.targets(attempt, [examQuestionId])).get(examQuestionId);
    if (!target) throw new AppException(ErrorCode.ATTEMPT_QUESTION_NOT_FOUND);
    if (target.type !== QuestionType.SPOKEN_RESPONSE) {
      throw fieldError('file', 'Chỉ câu Speaking mới tải lên bài nói');
    }

    const { data, seconds } = await this.recordings.normalize(file.buffer);
    if (recordingTooLong(seconds, target.responseSeconds)) {
      throw new AppException(ErrorCode.ATTEMPT_RECORDING_TOO_LONG);
    }

    const key = `${RECORDING_KEY_PREFIX}${randomUUID()}.mp3`;
    await this.storage.save(key, data, { contentType: 'audio/mpeg' });

    const where = { attemptId_examQuestionId: { attemptId: id, examQuestionId } };
    const now = new Date();
    try {
      const previous = await this.prisma.attemptAnswer.findUnique({
        where,
        select: { audioKey: true },
      });
      await this.prisma.attemptAnswer.upsert({
        where,
        create: { attemptId: id, examQuestionId, audioKey: key, answeredAt: now },
        update: { audioKey: key, answeredAt: now },
      });
      // Bài nói cũ không còn dùng: xóa sau khi đã ghi key mới; lỗi xóa thì để job dọn dẹp (đợt sau)
      if (previous?.audioKey) {
        await this.storage.delete(previous.audioKey).catch((error: unknown) => {
          this.logger.warn(`Không xóa được bài nói cũ ${previous.audioKey}: ${String(error)}`);
        });
      }
    } catch (error) {
      // Ghi DB lỗi: bỏ tệp vừa lưu để không sót tệp mồ côi trong kho
      await this.storage.delete(key).catch(() => undefined);
      throw error;
    }

    return {
      examQuestionId,
      seconds: Math.round(seconds * 10) / 10,
      remainingSeconds: remainingSeconds(attempt.expiresAt, now),
    };
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
        text_answer AS "textAnswer", is_flagged AS "isFlagged", answered_at AS "answeredAt",
        audio_key IS NOT NULL AS "hasRecording"`;
    if (answer) return { answer, applied: true };

    // Bản đã lưu mới hơn: giữ nguyên và trả lại bản đó
    const existing = await db.attemptAnswer.findUniqueOrThrow({
      where: { attemptId_examQuestionId: { attemptId, examQuestionId } },
      select: answerSelect,
    });
    return { answer: toAnswerItem(existing), applied: false };
  }
}
