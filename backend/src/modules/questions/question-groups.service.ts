import { Injectable } from '@nestjs/common';
import { shortLabel, skip, type BulkSkippedItem } from '../../common/dto/bulk-delete.dto.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { MediaUrlService } from '../media/media-url.service.js';
import type {
  CreateQuestionGroupDto,
  QuestionGroupQueryDto,
  UpdateQuestionGroupDto,
} from './dto/question-group.dto.js';
import { assertOwner, QuestionReferencesService } from './question-references.service.js';
import { assertGroupRules } from './question-rules.js';
import {
  groupDetailSelect,
  groupSummarySelect,
  toGroupDetail,
  toGroupSummary,
} from './questions.mapper.js';
import type {
  ContentLock,
  GroupBulkDeleteResult,
  QuestionGroupDetail,
  QuestionGroupSummary,
} from './questions.types.js';

function blankToNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

@Injectable()
export class QuestionGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: QuestionReferencesService,
    private readonly media: MediaUrlService,
  ) {}

  async list(
    query: QuestionGroupQueryDto,
    user: AuthUser,
  ): Promise<WithMeta<QuestionGroupSummary[]>> {
    const where: Prisma.QuestionGroupWhereInput = {
      deletedAt: null,
      skill: query.skill,
      part: query.part,
      topicId: query.topicId,
      status: query.status,
      authorId: query.mine ? user.id : undefined,
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.questionGroup.findMany({
        where,
        select: groupSummarySelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...toPrismaPage(query),
      }),
      this.prisma.questionGroup.count({ where }),
    ]);

    return paginate(
      rows.map((row) => toGroupSummary(row, this.media)),
      total,
      query,
    );
  }

  async get(id: string): Promise<QuestionGroupDetail> {
    const row = await this.prisma.questionGroup.findFirst({
      where: { id, deletedAt: null },
      select: groupDetailSelect,
    });
    if (!row) throw new AppException(ErrorCode.QUESTION_GROUP_NOT_FOUND);
    return toGroupDetail(row, this.media, await this.lockOf(id));
  }

  /** Nhóm bị khóa khi một câu của nhóm đang được làm bài (D29) */
  async lockOf(id: string): Promise<ContentLock | null> {
    return this.refs.contentLock(await this.questionIds(id));
  }

  /** Id các câu của nhóm, kể cả câu đã xóa mềm (đề cũ vẫn có thể trỏ tới) */
  async questionIds(id: string): Promise<string[]> {
    const rows = await this.prisma.question.findMany({
      where: { groupId: id },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async create(dto: CreateQuestionGroupDto, user: AuthUser): Promise<QuestionGroupDetail> {
    const passage = blankToNull(dto.passage);
    const transcript = blankToNull(dto.transcript);

    assertGroupRules({ skill: dto.skill, part: dto.part, passage, transcript });
    await this.refs.assertTopic(dto.topicId, dto.skill, dto.part);

    const row = await this.prisma.questionGroup.create({
      data: {
        topicId: dto.topicId,
        authorId: user.id,
        skill: dto.skill,
        part: dto.part,
        passage,
        transcript,
        status: dto.status,
      },
      select: groupDetailSelect,
    });
    // Nhóm mới chưa nằm trong đề nào
    return toGroupDetail(row, this.media, null);
  }

  async update(
    id: string,
    dto: UpdateQuestionGroupDto,
    user: AuthUser,
  ): Promise<QuestionGroupDetail> {
    const existing = await this.prisma.questionGroup.findFirst({
      where: { id, deletedAt: null },
      select: {
        authorId: true,
        topicId: true,
        skill: true,
        part: true,
        passage: true,
        transcript: true,
      },
    });
    if (!existing) throw new AppException(ErrorCode.QUESTION_GROUP_NOT_FOUND);
    assertOwner(existing.authorId, user.id);

    const topicId = dto.topicId ?? existing.topicId;
    const passage = dto.passage === undefined ? existing.passage : blankToNull(dto.passage);
    const transcript =
      dto.transcript === undefined ? existing.transcript : blankToNull(dto.transcript);

    // skill, part của nhóm cố định (DTO không cho sửa) nên chỉ kiểm tra lại nội dung và chủ đề
    assertGroupRules({ skill: existing.skill, part: existing.part, passage, transcript });
    if (dto.topicId) await this.refs.assertTopic(topicId, existing.skill, existing.part);
    // Đoạn văn học viên đọc khi làm bài: khóa khi nhóm đang được làm bài (lời thoại chỉ hiện ở màn
    // xem lại nên vẫn sửa được)
    if (passage !== existing.passage) {
      await this.refs.assertContentUnlocked(await this.questionIds(id), ['passage'], 'group');
    }

    const { count } = await this.prisma.questionGroup.updateMany({
      where: { id, deletedAt: null, updatedAt: new Date(dto.updatedAt) },
      data: { topicId, passage, transcript, status: dto.status ?? undefined },
    });
    if (count === 0) throw new AppException(ErrorCode.VERSION_CONFLICT);

    return this.get(id);
  }

  /** withQuestions: xóa luôn các câu trong nhóm (nhóm là một khối, câu không đứng riêng được) */
  async remove(id: string, user: AuthUser, withQuestions = false): Promise<void> {
    const existing = await this.prisma.questionGroup.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true, questions: { where: { deletedAt: null }, select: { id: true } } },
    });
    if (!existing) throw new AppException(ErrorCode.QUESTION_GROUP_NOT_FOUND);
    assertOwner(existing.authorId, user.id);

    const questionIds = existing.questions.map((question) => question.id);
    // Không để câu hỏi còn hiệu lực trỏ vào một nhóm đã xóa
    if (questionIds.length > 0 && !withQuestions) {
      throw new AppException(ErrorCode.QUESTION_GROUP_NOT_EMPTY);
    }
    if ((await this.refs.publishedQuestionIds(questionIds)).size > 0) {
      throw new AppException(ErrorCode.QUESTION_IN_PUBLISHED_EXAM);
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.question.updateMany({
        where: { groupId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.questionGroup.update({ where: { id }, data: { deletedAt: now } }),
    ]);
  }

  /**
   * Xóa nhiều nhóm. Bỏ qua (kèm lý do) nhóm không tồn tại, của giáo viên khác, còn câu khi
   * withQuestions = false, hoặc có câu đang ở đề đã xuất bản (bỏ cả nhóm vì nhóm là một khối)
   */
  async bulkRemove(
    ids: string[],
    withQuestions: boolean,
    user: AuthUser,
  ): Promise<GroupBulkDeleteResult> {
    const rows = await this.prisma.questionGroup.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: {
        id: true,
        skill: true,
        part: true,
        passage: true,
        transcript: true,
        authorId: true,
        questions: { where: { deletedAt: null }, select: { id: true } },
      },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const locked = await this.refs.publishedQuestionIds(
      rows.flatMap((row) => row.questions.map((question) => question.id)),
    );

    const skipped: BulkSkippedItem[] = [];
    const deletable: string[] = [];
    for (const id of ids) {
      const row = byId.get(id);
      if (!row) {
        skipped.push(skip(id, null, 'NOT_FOUND'));
        continue;
      }
      // Nhóm không có mã: hiện "R7 · đoạn đầu đoạn văn" để giáo viên nhận ra
      const label = `${row.skill.charAt(0)}${row.part} · ${shortLabel(row.transcript ?? row.passage, 32) ?? 'Chưa có nội dung'}`;
      if (row.authorId !== user.id) skipped.push(skip(id, label, 'NOT_OWNER'));
      else if (row.questions.length > 0 && !withQuestions) {
        skipped.push(skip(id, label, 'NOT_EMPTY'));
      } else if (row.questions.some((question) => locked.has(question.id))) {
        skipped.push(skip(id, label, 'IN_PUBLISHED_EXAM'));
      } else deletable.push(id);
    }

    if (deletable.length === 0) return { deleted: 0, deletedQuestions: 0, skipped };

    const now = new Date();
    const [questions, groups] = await this.prisma.$transaction([
      this.prisma.question.updateMany({
        where: { groupId: { in: deletable }, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.questionGroup.updateMany({
        where: { id: { in: deletable }, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
    return { deleted: groups.count, deletedQuestions: questions.count, skipped };
  }
}
