import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import type { WithMeta } from '../../common/types/api-response.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ExamStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { CreateExamDto, ExamQueryDto, UpdateExamDto } from './dto/exam.dto.js';
import { checkExam } from './exam-check.js';
import {
  examCheckSelect,
  examDetailSelect,
  examPaperSelect,
  examSummarySelect,
  toExamDetail,
  toExamPaper,
  toExamSummary,
} from './exams.mapper.js';
import { ExamIssueLevel } from './exams.types.js';
import type { ExamDetail, ExamPaper, ExamSummary, ExamValidation } from './exams.types.js';

/** Chuỗi rỗng (sau khi trim) coi như không nhập: lưu null */
function blankToNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

/**
 * Đề thi thuộc riêng giáo viên tạo ra (khác ngân hàng câu hỏi dùng chung): mọi truy vấn lọc theo
 * authorId, đề của người khác coi như không tồn tại (404, không lộ thông tin).
 */
@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  private ownedWhere(id: string, user: AuthUser): Prisma.ExamWhereInput {
    return { id, authorId: user.id, deletedAt: null };
  }

  async list(query: ExamQueryDto, user: AuthUser): Promise<WithMeta<ExamSummary[]>> {
    const where: Prisma.ExamWhereInput = {
      authorId: user.id,
      deletedAt: null,
      status: query.status,
      scoringScale: query.scoringScale,
      title: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        select: examSummarySelect,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        ...toPrismaPage(query),
      }),
      this.prisma.exam.count({ where }),
    ]);

    return paginate(rows.map(toExamSummary), total, query);
  }

  async get(id: string, user: AuthUser): Promise<ExamDetail> {
    const row = await this.prisma.exam.findFirst({
      where: this.ownedWhere(id, user),
      select: examDetailSelect,
    });
    if (!row) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    return toExamDetail(row);
  }

  async create(dto: CreateExamDto, user: AuthUser): Promise<ExamDetail> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, isActive: true },
      select: { id: true },
    });
    if (!subject) throw fieldError('subjectId', 'Chương trình thi không tồn tại');

    // Đề mới luôn ở trạng thái Bản nháp (UC Tạo đề thi, bước 4)
    const row = await this.prisma.exam.create({
      data: {
        authorId: user.id,
        subjectId: dto.subjectId,
        title: dto.title,
        description: blankToNull(dto.description),
        scoringScale: dto.scoringScale,
        durationMinutes: dto.durationMinutes,
        maxAttempts: dto.maxAttempts ?? null,
        allowPartPractice: dto.allowPartPractice ?? true,
      },
      select: examDetailSelect,
    });
    return toExamDetail(row);
  }

  async update(id: string, dto: UpdateExamDto, user: AuthUser): Promise<ExamDetail> {
    const existing = await this.prisma.exam.findFirst({
      where: this.ownedWhere(id, user),
      select: { scoringScale: true, _count: { select: { sections: true } } },
    });
    if (!existing) throw new AppException(ErrorCode.EXAM_NOT_FOUND);

    // Thang điểm quyết định Part nào được có trong đề: đã có phần thi thì không đổi được
    if (
      dto.scoringScale &&
      dto.scoringScale !== existing.scoringScale &&
      existing._count.sections > 0
    ) {
      throw fieldError('scoringScale', 'Xóa hết phần thi trước khi đổi thang điểm');
    }

    // Khóa lạc quan: chỉ cập nhật khi updatedAt còn đúng như lúc client đọc.
    // Prisma bỏ qua trường undefined (không gửi = giữ nguyên); maxAttempts null = bỏ giới hạn
    const { count } = await this.prisma.exam.updateMany({
      where: { ...this.ownedWhere(id, user), updatedAt: new Date(dto.updatedAt) },
      data: {
        title: dto.title,
        description: dto.description === undefined ? undefined : blankToNull(dto.description),
        scoringScale: dto.scoringScale,
        durationMinutes: dto.durationMinutes,
        maxAttempts: dto.maxAttempts,
        allowPartPractice: dto.allowPartPractice,
      },
    });
    if (count === 0) throw new AppException(ErrorCode.VERSION_CONFLICT);

    return this.get(id, user);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const existing = await this.prisma.exam.findFirst({
      where: this.ownedWhere(id, user),
      select: { status: true },
    });
    if (!existing) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    if (existing.status === ExamStatus.PUBLISHED) throw new AppException(ErrorCode.EXAM_PUBLISHED);

    // Xóa mềm: bài làm cũ (Giai đoạn 2) vẫn tham chiếu được tới đề
    await this.prisma.exam.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async validate(id: string, user: AuthUser): Promise<ExamValidation> {
    const exam = await this.prisma.exam.findFirst({
      where: this.ownedWhere(id, user),
      select: examCheckSelect,
    });
    if (!exam) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    return checkExam(exam);
  }

  /** Đề đúng như học viên sẽ nhận: không đáp án, không câu trả lời mẫu, không lời thoại */
  async preview(id: string, user: AuthUser): Promise<ExamPaper> {
    const row = await this.prisma.exam.findFirst({
      where: this.ownedWhere(id, user),
      select: examPaperSelect,
    });
    if (!row) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    return toExamPaper(row);
  }

  async publish(id: string, user: AuthUser): Promise<ExamDetail> {
    const exam = await this.prisma.exam.findFirst({
      where: this.ownedWhere(id, user),
      select: examCheckSelect,
    });
    if (!exam) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    if (exam.status === ExamStatus.PUBLISHED) return this.get(id, user); // gọi lại không lỗi

    // Chưa đủ điều kiện: liệt kê cụ thể từng lỗi, không đổi trạng thái (UC, luồng thay thế 1)
    const result = checkExam(exam);
    if (!result.publishable) {
      throw new AppException(
        ErrorCode.EXAM_NOT_PUBLISHABLE,
        undefined,
        result.issues.filter((issue) => issue.level === ExamIssueLevel.ERROR),
      );
    }

    await this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.PUBLISHED, publishedAt: new Date() },
    });
    return this.get(id, user);
  }

  /** Ẩn khỏi danh sách của học viên; bài làm đã có giữ nguyên. Đề chưa xuất bản thì giữ nguyên trạng thái */
  async unpublish(id: string, user: AuthUser): Promise<ExamDetail> {
    const exam = await this.prisma.exam.findFirst({
      where: this.ownedWhere(id, user),
      select: { status: true },
    });
    if (!exam) throw new AppException(ErrorCode.EXAM_NOT_FOUND);

    if (exam.status === ExamStatus.PUBLISHED) {
      await this.prisma.exam.update({
        where: { id },
        data: { status: ExamStatus.UNPUBLISHED },
      });
    }
    return this.get(id, user);
  }
}
