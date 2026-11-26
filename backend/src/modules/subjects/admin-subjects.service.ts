import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import { Prisma } from '../../generated/prisma/client.js';
import { SubjectCategory, type Skill } from '../../generated/prisma/enums.js';
import { AuditContext, type AuditSnapshot } from '../../infra/audit/audit-context.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { AdminSubjectItem, AdminTopicItem } from './admin-subjects.types.js';
import type {
  CreateSubjectDto,
  CreateTopicDto,
  UpdateSubjectDto,
  UpdateTopicDto,
} from './dto/admin-subject.dto.js';
import type { TopicQueryDto } from './dto/topic-query.dto.js';
import {
  invalidParts,
  normalizeParts,
  partsOfSkill,
  PROTECTED_SUBJECT_CODE,
  removedParts,
} from './subject-rules.js';

const subjectSelect = {
  id: true,
  code: true,
  name: true,
  category: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SubjectSelect;

const topicSelect = {
  id: true,
  subjectId: true,
  skill: true,
  parts: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TopicSelect;

type SubjectRow = Prisma.SubjectGetPayload<{ select: typeof subjectSelect }>;
type TopicRow = Prisma.TopicGetPayload<{ select: typeof topicSelect }>;

const isPrismaError = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const NOT_DELETED = { deletedAt: null };

/**
 * Admin quản lý chương trình thi và chủ đề (SPRINT-69). Không làm hỏng dữ liệu đang dùng: chủ đề
 * có câu hỏi thì không đổi kỹ năng, không bỏ Part đang dùng, không xóa; chương trình có đề thi hay
 * câu hỏi thì không xóa (chỉ ẩn); TOEIC là chương trình hệ thống nên không ẩn, không xóa
 */
@Injectable()
export class AdminSubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditContext,
  ) {}

  // -------------------------------------------------------------------------------------------
  // Chương trình thi

  async listSubjects(): Promise<AdminSubjectItem[]> {
    const subjects = await this.prisma.subject.findMany({
      select: subjectSelect,
      orderBy: { code: 'asc' },
    });
    return this.withSubjectStats(subjects);
  }

  async getSubject(id: string): Promise<AdminSubjectItem> {
    const [item] = await this.withSubjectStats([await this.findSubjectOrThrow(id)]);
    return item;
  }

  async createSubject(dto: CreateSubjectDto): Promise<AdminSubjectItem> {
    try {
      const subject = await this.prisma.subject.create({
        data: { code: dto.code, name: dto.name, category: dto.category },
        select: subjectSelect,
      });
      this.audit.setEntityId(subject.id);
      this.audit.setAfter(subjectSnapshot(subject));
      return this.getSubject(subject.id);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw new AppException(ErrorCode.SUBJECT_CODE_EXISTS);
      throw error;
    }
  }

  async updateSubject(id: string, dto: UpdateSubjectDto): Promise<AdminSubjectItem> {
    const subject = await this.findSubjectOrThrow(id);
    if (dto.isActive === false && isProtected(subject)) {
      throw new AppException(
        ErrorCode.SUBJECT_PROTECTED,
        'Không thể ẩn chương trình TOEIC: giao diện giáo viên và tệp nhập câu hỏi đang dùng',
      );
    }

    // Khóa lạc quan: chỉ ghi khi updatedAt còn khớp lần đọc của admin
    const { count } = await this.prisma.subject.updateMany({
      where: { id, updatedAt: new Date(dto.updatedAt) },
      data: { name: dto.name, isActive: dto.isActive, updatedAt: new Date() },
    });
    if (count === 0) throw new AppException(ErrorCode.VERSION_CONFLICT);

    const updated = await this.findSubjectOrThrow(id);
    this.audit.setBefore(subjectSnapshot(subject));
    this.audit.setAfter(subjectSnapshot(updated));
    return this.getSubject(id);
  }

  async deleteSubject(id: string): Promise<void> {
    const subject = await this.findSubjectOrThrow(id);
    if (isProtected(subject)) {
      throw new AppException(
        ErrorCode.SUBJECT_PROTECTED,
        'Không thể xóa chương trình TOEIC: giao diện giáo viên và tệp nhập câu hỏi đang dùng',
      );
    }

    // Tính cả đề, câu hỏi đã xóa mềm: khóa ngoại RESTRICT vẫn chặn xóa
    const topics = { topic: { subjectId: id } };
    const [exams, questions, groups] = await Promise.all([
      this.prisma.exam.count({ where: { subjectId: id } }),
      this.prisma.question.count({ where: topics }),
      this.prisma.questionGroup.count({ where: topics }),
    ]);
    if (exams + questions + groups > 0) {
      throw new AppException(
        ErrorCode.SUBJECT_IN_USE,
        `Chương trình đang có ${exams} đề thi, ${questions} câu hỏi, ${groups} nhóm câu (tính cả ` +
          'bản đã xóa). Hãy ẩn chương trình thay vì xóa',
        { exams, questions, groups },
      );
    }

    try {
      // Chủ đề xóa theo (ON DELETE CASCADE)
      await this.prisma.subject.delete({ where: { id } });
    } catch (error) {
      // Có người vừa tạo đề hoặc câu hỏi giữa lúc kiểm tra và lúc xóa
      if (isPrismaError(error, 'P2003')) throw new AppException(ErrorCode.SUBJECT_IN_USE);
      throw error;
    }
    this.audit.setBefore(subjectSnapshot(subject));
  }

  // -------------------------------------------------------------------------------------------
  // Chủ đề

  async listTopics(subjectId: string, query: TopicQueryDto): Promise<AdminTopicItem[]> {
    await this.findSubjectOrThrow(subjectId);
    const topics = await this.prisma.topic.findMany({
      where: {
        subjectId,
        skill: query.skill,
        parts: query.part === undefined ? undefined : { has: query.part },
      },
      select: topicSelect,
      // Enum sắp theo thứ tự khai báo: LISTENING, READING, SPEAKING, WRITING
      orderBy: [{ skill: 'asc' }, { name: 'asc' }],
    });
    return this.withTopicStats(topics);
  }

  async createTopic(subjectId: string, dto: CreateTopicDto): Promise<AdminTopicItem> {
    const subject = await this.findSubjectOrThrow(subjectId);
    if (subject.category !== SubjectCategory.TOEIC) {
      throw new AppException(ErrorCode.TOPICS_NOT_SUPPORTED);
    }
    const parts = validParts(dto.skill, dto.parts);

    try {
      const topic = await this.prisma.topic.create({
        data: {
          subjectId,
          name: dto.name,
          skill: dto.skill,
          parts,
          description: dto.description || null,
        },
        select: topicSelect,
      });
      this.audit.setEntityId(topic.id);
      this.audit.setAfter(topicSnapshot(topic));
      this.audit.setMeta({ subject: subject.code });
      return (await this.withTopicStats([topic]))[0];
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw new AppException(ErrorCode.TOPIC_NAME_EXISTS);
      throw error;
    }
  }

  async updateTopic(
    subjectId: string,
    topicId: string,
    dto: UpdateTopicDto,
  ): Promise<AdminTopicItem> {
    const subject = await this.findSubjectOrThrow(subjectId);
    const topic = await this.findTopicOrThrow(subjectId, topicId);
    const skill = dto.skill ?? topic.skill;
    // Đổi kỹ năng mà không gửi Part mới thì Part cũ cũng phải hợp với kỹ năng mới
    const parts = validParts(skill, dto.parts ?? topic.parts);

    // Câu hỏi, nhóm câu chưa xóa phải còn khớp kỹ năng và Part của chủ đề
    if (skill !== topic.skill) {
      const usage = await this.usage(topicId);
      if (usage.questions + usage.groups > 0) {
        throw new AppException(
          ErrorCode.TOPIC_IN_USE,
          `Không đổi được kỹ năng: chủ đề đang có ${usage.questions} câu hỏi, ${usage.groups} nhóm câu`,
          usage,
        );
      }
    } else {
      const removed = removedParts(topic.parts, parts);
      const usage = removed.length ? await this.usage(topicId, removed) : null;
      if (usage && usage.questions + usage.groups > 0) {
        throw new AppException(
          ErrorCode.TOPIC_IN_USE,
          `Không bỏ được Part ${removed.join(', ')}: còn ${usage.questions} câu hỏi, ` +
            `${usage.groups} nhóm câu thuộc Part này`,
          { ...usage, parts: removed },
        );
      }
    }

    try {
      const { count } = await this.prisma.topic.updateMany({
        where: { id: topicId, subjectId, updatedAt: new Date(dto.updatedAt) },
        data: {
          name: dto.name,
          skill,
          parts,
          description: dto.description === undefined ? undefined : dto.description || null,
          updatedAt: new Date(),
        },
      });
      if (count === 0) throw new AppException(ErrorCode.VERSION_CONFLICT);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw new AppException(ErrorCode.TOPIC_NAME_EXISTS);
      throw error;
    }

    const updated = await this.findTopicOrThrow(subjectId, topicId);
    this.audit.setEntityId(topicId);
    this.audit.setBefore(topicSnapshot(topic));
    this.audit.setAfter(topicSnapshot(updated));
    this.audit.setMeta({ subject: subject.code });
    return (await this.withTopicStats([updated]))[0];
  }

  async deleteTopic(subjectId: string, topicId: string): Promise<void> {
    const subject = await this.findSubjectOrThrow(subjectId);
    const topic = await this.findTopicOrThrow(subjectId, topicId);

    // Tính cả bản đã xóa mềm: khóa ngoại RESTRICT vẫn chặn xóa
    const [questions, groups] = await Promise.all([
      this.prisma.question.count({ where: { topicId } }),
      this.prisma.questionGroup.count({ where: { topicId } }),
    ]);
    if (questions + groups > 0) {
      throw new AppException(
        ErrorCode.TOPIC_IN_USE,
        `Chủ đề đang có ${questions} câu hỏi, ${groups} nhóm câu (tính cả bản đã xóa), không xóa được`,
        { questions, groups },
      );
    }

    try {
      await this.prisma.topic.delete({ where: { id: topicId } });
    } catch (error) {
      if (isPrismaError(error, 'P2003')) throw new AppException(ErrorCode.TOPIC_IN_USE);
      throw error;
    }
    this.audit.setEntityId(topicId);
    this.audit.setBefore(topicSnapshot(topic));
    this.audit.setMeta({ subject: subject.code });
  }

  // -------------------------------------------------------------------------------------------

  private async findSubjectOrThrow(id: string): Promise<SubjectRow> {
    const subject = await this.prisma.subject.findUnique({ where: { id }, select: subjectSelect });
    if (!subject) throw new AppException(ErrorCode.SUBJECT_NOT_FOUND);
    return subject;
  }

  private async findTopicOrThrow(subjectId: string, topicId: string): Promise<TopicRow> {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, subjectId },
      select: topicSelect,
    });
    if (!topic) throw new AppException(ErrorCode.TOPIC_NOT_FOUND);
    return topic;
  }

  /** Câu hỏi, nhóm câu chưa xóa dùng chủ đề (chỉ tính các Part truyền vào nếu có) */
  private async usage(
    topicId: string,
    parts?: number[],
  ): Promise<{ questions: number; groups: number }> {
    const where = { topicId, ...NOT_DELETED, ...(parts && { part: { in: parts } }) };
    const [questions, groups] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.questionGroup.count({ where }),
    ]);
    return { questions, groups };
  }

  /** Đếm gộp bằng groupBy, không truy vấn từng dòng */
  private async withSubjectStats(subjects: SubjectRow[]): Promise<AdminSubjectItem[]> {
    const ids = subjects.map((subject) => subject.id);
    const [topics, exams, questions] = await Promise.all([
      this.prisma.topic.groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.exam.groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: ids }, ...NOT_DELETED },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<{ subject_id: string; count: number }[]>`
        SELECT t.subject_id, COUNT(q.id)::int AS count
        FROM questions q JOIN topics t ON t.id = q.topic_id
        WHERE q.deleted_at IS NULL AND t.subject_id = ANY(${ids}::uuid[])
        GROUP BY t.subject_id`,
    ]);
    const countOf = <T extends { subjectId: string; _count: { _all: number } }>(
      rows: T[],
      id: string,
    ) => rows.find((row) => row.subjectId === id)?._count._all ?? 0;

    return subjects.map((subject) => ({
      ...subject,
      isProtected: isProtected(subject),
      topicCount: countOf(topics, subject.id),
      examCount: countOf(exams, subject.id),
      questionCount: questions.find((row) => row.subject_id === subject.id)?.count ?? 0,
    }));
  }

  private async withTopicStats(topics: TopicRow[]): Promise<AdminTopicItem[]> {
    const where = { topicId: { in: topics.map((topic) => topic.id) }, ...NOT_DELETED };
    const [questions, groups] = await Promise.all([
      this.prisma.question.groupBy({ by: ['topicId'], where, _count: { _all: true } }),
      this.prisma.questionGroup.groupBy({ by: ['topicId'], where, _count: { _all: true } }),
    ]);
    const countOf = (rows: { topicId: string; _count: { _all: number } }[], id: string) =>
      rows.find((row) => row.topicId === id)?._count._all ?? 0;

    return topics.map(({ subjectId: _subjectId, ...topic }) => ({
      ...topic,
      questionCount: countOf(questions, topic.id),
      groupCount: countOf(groups, topic.id),
    }));
  }
}

function isProtected(subject: Pick<SubjectRow, 'code'>): boolean {
  return subject.code === PROTECTED_SUBJECT_CODE;
}

/** Part hợp lệ của kỹ năng (bỏ trùng, sắp tăng dần); sai thì báo lỗi vào ô parts */
function validParts(skill: Skill, parts: number[]): number[] {
  const wrong = invalidParts(skill, parts);
  if (wrong.length) {
    throw fieldError(
      'parts',
      `Part ${wrong.join(', ')} không thuộc ${skill}; dùng được: ${partsOfSkill(skill).join(', ')}`,
    );
  }
  return normalizeParts(parts);
}

function subjectSnapshot(subject: SubjectRow): AuditSnapshot {
  return {
    code: subject.code,
    name: subject.name,
    category: subject.category,
    isActive: subject.isActive,
  };
}

function topicSnapshot(topic: TopicRow): AuditSnapshot {
  return {
    name: topic.name,
    skill: topic.skill,
    parts: topic.parts,
    description: topic.description,
  };
}
