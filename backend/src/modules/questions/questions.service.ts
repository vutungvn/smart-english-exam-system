import { Injectable } from '@nestjs/common';
import {
  BulkDeleteResult,
  shortLabel,
  skip,
  type BulkSkippedItem,
} from '../../common/dto/bulk-delete.dto.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { MediaUrlService } from '../media/media-url.service.js';
import type { CreateQuestionDto, QuestionOptionDto } from './dto/create-question.dto.js';
import type { QuestionQueryDto } from './dto/question-query.dto.js';
import type { UpdateQuestionDto } from './dto/update-question.dto.js';
import { assertOwner, QuestionReferencesService } from './question-references.service.js';
import { assertQuestionRules, type QuestionDraft } from './question-rules.js';
import {
  questionDetailSelect,
  questionSummarySelect,
  toQuestionDetail,
  toQuestionSummary,
} from './questions.mapper.js';
import type { QuestionDetail, QuestionSummary } from './questions.types.js';

/** Chuỗi rỗng (sau khi trim) coi như không nhập: lưu null */
function blankToNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

/** PATCH: undefined = không gửi → giữ giá trị cũ; null = xóa giá trị */
function pick<T>(value: T | undefined, current: T): T {
  return value === undefined ? current : value;
}

/** Thứ tự hiển thị lấy theo vị trí trong mảng gửi lên */
function toOptionRows(options: QuestionOptionDto[]) {
  return options.map(({ label, content, isCorrect }, orderIndex) => ({
    label,
    content,
    isCorrect,
    orderIndex,
  }));
}

/**
 * P2002 (uq_questions_group_order): vị trí trong nhóm đã có câu khác.
 * P2003 (fk_attempt_answers_selected_option_id): bỏ một phương án học viên đã chọn
 */
async function withGroupOrderCheck<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppException(ErrorCode.QUESTION_GROUP_ORDER_TAKEN);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new AppException(ErrorCode.QUESTION_OPTION_IN_USE);
    }
    throw error;
  }
}

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: QuestionReferencesService,
    private readonly media: MediaUrlService,
  ) {}

  async list(query: QuestionQueryDto, user: AuthUser): Promise<WithMeta<QuestionSummary[]>> {
    // Prisma bỏ qua điều kiện có giá trị undefined → bộ lọc nào không gửi thì không áp
    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
      skill: query.skill,
      part: query.part,
      topicId: query.topicId,
      type: query.type,
      difficulty: query.difficulty,
      status: query.status,
      groupId: query.groupId,
      authorId: query.mine ? user.id : undefined,
      // ILIKE '%q%': chạy được trên chỉ mục trigram ix_questions_content_trgm
      content: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
    };
    const [field, direction] = query.sort.split(':') as [
      'createdAt' | 'updatedAt' | 'part',
      Prisma.SortOrder,
    ];

    // Đếm và lấy trang trong cùng transaction để total khớp với dữ liệu trả về
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        select: questionSummarySelect,
        // Thêm id để thứ tự ổn định khi nhiều câu trùng giá trị sắp xếp (phân trang không lặp/sót)
        orderBy: [{ [field]: direction }, { id: 'asc' }],
        ...toPrismaPage(query),
      }),
      this.prisma.question.count({ where }),
    ]);

    return paginate(rows.map(toQuestionSummary), total, query);
  }

  async get(id: string): Promise<QuestionDetail> {
    const row = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      select: questionDetailSelect,
    });
    if (!row) throw new AppException(ErrorCode.QUESTION_NOT_FOUND);
    return toQuestionDetail(row, this.media);
  }

  async create(dto: CreateQuestionDto, user: AuthUser): Promise<QuestionDetail> {
    const draft: QuestionDraft = {
      skill: dto.skill,
      part: dto.part,
      type: dto.type,
      groupId: dto.groupId ?? null,
      orderInGroup: dto.orderInGroup ?? null,
      sampleAnswer: blankToNull(dto.sampleAnswer),
      prepSeconds: dto.prepSeconds ?? null,
      responseSeconds: dto.responseSeconds ?? null,
      options: dto.options ?? [],
    };

    // Kiểm tra quy tắc không cần DB trước, rồi mới truy vấn chủ đề và nhóm
    assertQuestionRules(draft);
    await this.refs.assertTopic(dto.topicId, dto.skill, dto.part);
    if (draft.groupId) {
      await this.refs.assertGroupForQuestion(draft.groupId, user.id, dto.skill, dto.part);
    }

    const row = await withGroupOrderCheck(() =>
      this.prisma.question.create({
        data: {
          topicId: dto.topicId,
          authorId: user.id,
          groupId: draft.groupId,
          orderInGroup: draft.orderInGroup,
          type: dto.type,
          skill: dto.skill,
          part: dto.part,
          difficulty: dto.difficulty,
          status: dto.status,
          content: dto.content,
          explanation: blankToNull(dto.explanation),
          sampleAnswer: draft.sampleAnswer,
          prepSeconds: draft.prepSeconds,
          responseSeconds: draft.responseSeconds,
          // Tạo câu và các phương án trong cùng một câu lệnh (một transaction)
          options: { create: toOptionRows(dto.options ?? []) },
        },
        select: questionDetailSelect,
      }),
    );

    return toQuestionDetail(row, this.media);
  }

  async update(id: string, dto: UpdateQuestionDto, user: AuthUser): Promise<QuestionDetail> {
    const existing = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      select: { ...questionDetailSelect, topicId: true, authorId: true },
    });
    if (!existing) throw new AppException(ErrorCode.QUESTION_NOT_FOUND);
    assertOwner(existing.authorId, user.id);

    // Ghép thay đổi vào bản hiện tại rồi kiểm tra lại toàn bộ: đổi Part có thể kéo theo
    // số phương án, nhóm, chủ đề phải đổi theo
    const topicId = dto.topicId ?? existing.topicId;
    const draft: QuestionDraft = {
      skill: dto.skill ?? existing.skill,
      part: dto.part ?? existing.part,
      type: dto.type ?? existing.type,
      groupId: pick(dto.groupId, existing.groupId),
      orderInGroup: pick(dto.orderInGroup, existing.orderInGroup),
      sampleAnswer:
        dto.sampleAnswer === undefined ? existing.sampleAnswer : blankToNull(dto.sampleAnswer),
      prepSeconds: pick(dto.prepSeconds, existing.prepSeconds),
      responseSeconds: pick(dto.responseSeconds, existing.responseSeconds),
      options: dto.options ?? existing.options,
    };

    assertQuestionRules(draft);
    await this.refs.assertTopic(topicId, draft.skill, draft.part);
    if (draft.groupId) {
      await this.refs.assertGroupForQuestion(draft.groupId, user.id, draft.skill, draft.part);
    }

    await withGroupOrderCheck(() =>
      this.prisma.$transaction(async (tx) => {
        // Khóa lạc quan: chỉ cập nhật khi updatedAt còn đúng như lúc client đọc
        const { count } = await tx.question.updateMany({
          where: { id, deletedAt: null, updatedAt: new Date(dto.updatedAt) },
          data: {
            topicId,
            skill: draft.skill,
            part: draft.part,
            type: draft.type,
            groupId: draft.groupId,
            orderInGroup: draft.orderInGroup,
            sampleAnswer: draft.sampleAnswer,
            prepSeconds: draft.prepSeconds,
            responseSeconds: draft.responseSeconds,
            difficulty: dto.difficulty ?? undefined,
            status: dto.status ?? undefined,
            content: dto.content ?? undefined,
            explanation: dto.explanation === undefined ? undefined : blankToNull(dto.explanation),
          },
        });
        if (count === 0) throw new AppException(ErrorCode.VERSION_CONFLICT);

        // Cập nhật phương án tại chỗ theo nhãn (A, B, C, D) để giữ nguyên id: câu trả lời của
        // học viên (attempt_answers) trỏ tới id phương án. Chỉ xóa phương án có nhãn không còn dùng
        if (dto.options) {
          const rows = toOptionRows(dto.options);
          await tx.questionOption.deleteMany({
            where: { questionId: id, label: { notIn: rows.map((option) => option.label) } },
          });
          for (const { label, ...option } of rows) {
            await tx.questionOption.upsert({
              where: { questionId_label: { questionId: id, label } },
              create: { ...option, label, questionId: id },
              update: option,
            });
          }
        }
      }),
    );

    return this.get(id);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const existing = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true },
    });
    if (!existing) throw new AppException(ErrorCode.QUESTION_NOT_FOUND);
    assertOwner(existing.authorId, user.id);
    if ((await this.refs.publishedQuestionIds([id])).size > 0) {
      throw new AppException(ErrorCode.QUESTION_IN_PUBLISHED_EXAM);
    }

    // Xóa mềm: đề thi, bài làm cũ vẫn tham chiếu được tới câu này
    await this.prisma.question.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /**
   * Xóa nhiều câu: câu hợp lệ bị xóa mềm trong một câu lệnh, câu không tồn tại, của giáo viên
   * khác hoặc đang ở đề đã xuất bản thì bỏ qua kèm lý do (cùng quy tắc với xóa từng câu)
   */
  async bulkRemove(ids: string[], user: AuthUser): Promise<BulkDeleteResult> {
    const rows = await this.prisma.question.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, code: true, content: true, authorId: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const locked = await this.refs.publishedQuestionIds(rows.map((row) => row.id));

    const skipped: BulkSkippedItem[] = [];
    const deletable: string[] = [];
    for (const id of ids) {
      const row = byId.get(id);
      const label = row ? (row.code ?? shortLabel(row.content)) : null;
      if (!row) skipped.push(skip(id, null, 'NOT_FOUND'));
      else if (row.authorId !== user.id) skipped.push(skip(id, label, 'NOT_OWNER'));
      else if (locked.has(id)) skipped.push(skip(id, label, 'IN_PUBLISHED_EXAM'));
      else deletable.push(id);
    }

    // deletedAt: null trong điều kiện: câu bị xóa ở tab khác giữa chừng thì không đếm hai lần
    const { count } = deletable.length
      ? await this.prisma.question.updateMany({
          where: { id: { in: deletable }, deletedAt: null },
          data: { deletedAt: new Date() },
        })
      : { count: 0 };
    return { deleted: count, skipped };
  }
}
