import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { WithMeta } from '../../common/types/api-response.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AttemptMode, AttemptStatus, ExamKind, ExamStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { findPartRule } from '../questions/toeic-parts.js';
import { remainingSeconds } from './attempt-rules.js';
import type { ExamCatalogQueryDto } from './dto/attempt.dto.js';
import type { ExamCatalogDetail, ExamCatalogItem } from './attempts.types.js';

/** Học viên chỉ thấy đề chuẩn đã xuất bản, chưa xóa (bộ luyện tập AI là đề riêng, Giai đoạn 3) */
const visibleWhere: Prisma.ExamWhereInput = {
  status: ExamStatus.PUBLISHED,
  deletedAt: null,
  kind: ExamKind.STANDARD,
};

const catalogSelect = {
  id: true,
  title: true,
  description: true,
  kind: true,
  scoringScale: true,
  durationMinutes: true,
  maxAttempts: true,
  allowPartPractice: true,
  publishedAt: true,
  sections: {
    orderBy: { orderIndex: 'asc' },
    select: { id: true, skill: true, part: true, _count: { select: { questions: true } } },
  },
} satisfies Prisma.ExamSelect;

type CatalogRow = Prisma.ExamGetPayload<{ select: typeof catalogSelect }>;
type MyAttempt = {
  id: string;
  examId: string;
  mode: AttemptMode;
  sectionId: string | null;
  status: AttemptStatus;
  expiresAt: Date | null;
};

/** Danh sách đề cho học viên (trang "Luyện đề thi"), kèm số lượt đã dùng và bài đang làm dở */
@Injectable()
export class ExamCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ExamCatalogQueryDto, user: AuthUser): Promise<WithMeta<ExamCatalogItem[]>> {
    const where: Prisma.ExamWhereInput = {
      ...visibleWhere,
      scoringScale: query.scoringScale,
      title: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
      sections: query.skill ? { some: { skill: query.skill } } : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        select: catalogSelect,
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        ...toPrismaPage(query),
      }),
      this.prisma.exam.count({ where }),
    ]);

    const mine = await this.myAttempts(
      rows.map((row) => row.id),
      user,
    );
    const now = new Date();
    return paginate(
      rows.map((row) => this.toItem(row, mine, now)),
      total,
      query,
    );
  }

  async get(id: string, user: AuthUser): Promise<ExamCatalogDetail> {
    const row = await this.prisma.exam.findFirst({
      where: { ...visibleWhere, id },
      select: catalogSelect,
    });
    if (!row) throw new AppException(ErrorCode.EXAM_NOT_FOUND);

    const mine = await this.myAttempts([row.id], user);
    return {
      ...this.toItem(row, mine, new Date()),
      sections: row.sections.map((section) => ({
        id: section.id,
        skill: section.skill,
        part: section.part,
        name: findPartRule(section.skill, section.part)?.name ?? `Part ${section.part}`,
        questionCount: section._count.questions,
      })),
    };
  }

  /** Lượt làm (trừ lượt đã hủy) của người xem trong các đề đang hiển thị */
  private myAttempts(examIds: string[], user: AuthUser): Promise<MyAttempt[]> {
    if (examIds.length === 0) return Promise.resolve([]);
    return this.prisma.examAttempt.findMany({
      where: {
        studentId: user.id,
        examId: { in: examIds },
        status: { not: AttemptStatus.CANCELLED },
      },
      select: {
        id: true,
        examId: true,
        mode: true,
        sectionId: true,
        status: true,
        expiresAt: true,
      },
    });
  }

  private toItem({ sections, ...row }: CatalogRow, mine: MyAttempt[], now: Date): ExamCatalogItem {
    const attempts = mine.filter((attempt) => attempt.examId === row.id);
    // Giới hạn số lượt chỉ áp cho lượt làm cả đề; luyện theo Part không tính
    const used = attempts.filter((attempt) => attempt.mode === AttemptMode.FULL).length;
    const inProgress = attempts.find((attempt) => attempt.status === AttemptStatus.IN_PROGRESS);

    return {
      ...row,
      skills: [...new Set(sections.map((section) => section.skill))],
      sectionCount: sections.length,
      questionCount: sections.reduce((sum, section) => sum + section._count.questions, 0),
      attemptsUsed: used,
      attemptsLeft: row.maxAttempts === null ? null : Math.max(0, row.maxAttempts - used),
      inProgress: inProgress
        ? {
            id: inProgress.id,
            mode: inProgress.mode,
            sectionId: inProgress.sectionId,
            remainingSeconds: remainingSeconds(inProgress.expiresAt, now),
          }
        : null,
    };
  }
}
