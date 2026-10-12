import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
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
import type { QuestionGroupDetail, QuestionGroupSummary } from './questions.types.js';

function blankToNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

@Injectable()
export class QuestionGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: QuestionReferencesService,
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

    return paginate(rows.map(toGroupSummary), total, query);
  }

  async get(id: string): Promise<QuestionGroupDetail> {
    const row = await this.prisma.questionGroup.findFirst({
      where: { id, deletedAt: null },
      select: groupDetailSelect,
    });
    if (!row) throw new AppException(ErrorCode.QUESTION_GROUP_NOT_FOUND);
    return toGroupDetail(row);
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
    return toGroupDetail(row);
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

    const { count } = await this.prisma.questionGroup.updateMany({
      where: { id, deletedAt: null, updatedAt: new Date(dto.updatedAt) },
      data: { topicId, passage, transcript, status: dto.status ?? undefined },
    });
    if (count === 0) throw new AppException(ErrorCode.VERSION_CONFLICT);

    return this.get(id);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const existing = await this.prisma.questionGroup.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true, _count: { select: { questions: { where: { deletedAt: null } } } } },
    });
    if (!existing) throw new AppException(ErrorCode.QUESTION_GROUP_NOT_FOUND);
    assertOwner(existing.authorId, user.id);

    // Không để câu hỏi còn hiệu lực trỏ vào một nhóm đã xóa
    if (existing._count.questions > 0) {
      throw new AppException(ErrorCode.QUESTION_GROUP_NOT_EMPTY);
    }

    await this.prisma.questionGroup.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
