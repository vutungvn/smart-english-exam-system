import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { TopicQueryDto } from './dto/topic-query.dto.js';
import type { SubjectItem, TopicItem } from './subjects.types.js';

// Chỉ đọc. CRUD chương trình thi/chủ đề cho admin (/admin/subjects) làm cùng module Quản trị
@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  listSubjects(): Promise<SubjectItem[]> {
    return this.prisma.subject.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, category: true },
      orderBy: { code: 'asc' },
    });
  }

  async listTopics(subjectId: string, query: TopicQueryDto): Promise<TopicItem[]> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, isActive: true },
      select: { id: true },
    });
    if (!subject) throw new AppException(ErrorCode.SUBJECT_NOT_FOUND);

    return this.prisma.topic.findMany({
      where: {
        subjectId,
        skill: query.skill,
        // parts là mảng: { has: 3 } ↔ SQL "3 = ANY(parts)"
        parts: query.part === undefined ? undefined : { has: query.part },
      },
      select: { id: true, skill: true, parts: true, name: true, description: true },
      // Enum trong PostgreSQL sắp theo thứ tự khai báo: LISTENING, READING, SPEAKING, WRITING
      orderBy: [{ skill: 'asc' }, { name: 'asc' }],
    });
  }
}
