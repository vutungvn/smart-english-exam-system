import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ExamStatus, QuestionStatus, ScoringScale } from '../../generated/prisma/enums.js';
import type { Skill } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { describePart, findPartRule } from '../questions/toeic-parts.js';
import type { AddExamQuestionsDto, AddExamSectionDto } from './dto/exam-content.dto.js';
import { excerpt, partOrder, SCALE_SKILLS } from './exam-structure.js';
import { ExamsService } from './exams.service.js';
import type { ExamDetail } from './exams.types.js';

export interface SectionRef {
  id: string;
  skill: Skill;
  part: number;
}

const SCALE_SKILL_MESSAGE: Record<ScoringScale, string> = {
  [ScoringScale.TOEIC_990]: 'Đề TOEIC LR chỉ gồm các Part Listening và Reading',
  [ScoringScale.TOEIC_SW]: 'Đề TOEIC SW chỉ gồm các Part Speaking và Writing',
  [ScoringScale.PERCENT]: '',
};

/** Vi phạm ràng buộc unique (P2002) khi hai request thêm cùng lúc: đổi thành mã lỗi nghiệp vụ */
async function mapUnique<T>(action: () => Promise<T>, code: ErrorCode): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppException(code);
    }
    throw error;
  }
}

/**
 * Soạn nội dung đề: phần thi (mỗi phần một Part) và câu hỏi trong phần. Chỉ sửa được khi đề
 * chưa xuất bản, để bài làm đang dở luôn ứng với đúng bộ câu học viên đã nhận.
 * Mỗi thao tác trả lại toàn bộ đề (ExamDetail) để màn soạn đề vẽ lại ngay.
 */
@Injectable()
export class ExamContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exams: ExamsService,
  ) {}

  /** Đề của mình, còn hiệu lực, chưa xuất bản */
  private async loadEditable(examId: string, user: AuthUser) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, authorId: user.id, deletedAt: null },
      select: { id: true, status: true, scoringScale: true },
    });
    if (!exam) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    if (exam.status === ExamStatus.PUBLISHED) throw new AppException(ErrorCode.EXAM_PUBLISHED);
    return exam;
  }

  private async loadSection(examId: string, sectionId: string): Promise<SectionRef> {
    const section = await this.prisma.examSection.findFirst({
      where: { id: sectionId, examId },
      select: { id: true, skill: true, part: true },
    });
    if (!section) throw new AppException(ErrorCode.EXAM_SECTION_NOT_FOUND);
    return section;
  }

  /** Mọi thay đổi nội dung đều đổi updatedAt của đề: PATCH đề dùng bản cũ sẽ bị 409 */
  private touch(examId: string) {
    return this.prisma.exam.update({ where: { id: examId }, data: { updatedAt: new Date() } });
  }

  async addSection(examId: string, dto: AddExamSectionDto, user: AuthUser): Promise<ExamDetail> {
    const exam = await this.loadEditable(examId, user);
    const rule = findPartRule(dto.skill, dto.part);
    if (!rule) throw fieldError('part', `Kỹ năng ${dto.skill} không có Part ${dto.part}`);
    if (!SCALE_SKILLS[exam.scoringScale].includes(dto.skill)) {
      throw fieldError('skill', SCALE_SKILL_MESSAGE[exam.scoringScale]);
    }

    // uq_exam_sections_exam_part: mỗi Part chỉ một phần thi trong đề
    await mapUnique(
      () =>
        this.prisma.$transaction([
          this.prisma.examSection.create({
            data: {
              examId,
              skill: dto.skill,
              part: dto.part,
              orderIndex: partOrder(dto.skill, dto.part),
            },
          }),
          this.touch(examId),
        ]),
      ErrorCode.EXAM_SECTION_EXISTS,
    );
    return this.exams.get(examId, user);
  }

  /** Xóa phần thi kèm mọi câu trong phần (ON DELETE CASCADE) */
  async removeSection(examId: string, sectionId: string, user: AuthUser): Promise<ExamDetail> {
    await this.loadEditable(examId, user);
    await this.loadSection(examId, sectionId);

    await this.prisma.$transaction([
      this.prisma.examSection.delete({ where: { id: sectionId } }),
      this.touch(examId),
    ]);
    return this.exams.get(examId, user);
  }

  async addQuestions(
    examId: string,
    sectionId: string,
    dto: AddExamQuestionsDto,
    user: AuthUser,
  ): Promise<ExamDetail> {
    await this.loadEditable(examId, user);
    const section = await this.loadSection(examId, sectionId);
    const rule = findPartRule(section.skill, section.part);
    if (!rule) throw new AppException(ErrorCode.EXAM_SECTION_NOT_FOUND);
    const partName = describePart(rule);

    const questionIds = [...new Set(dto.questionIds ?? [])];
    const groupIds = [...new Set(dto.groupIds ?? [])];
    if (questionIds.length === 0 && groupIds.length === 0) {
      throw fieldError('questionIds', 'Chọn ít nhất một câu hỏi hoặc một nhóm câu');
    }
    // Part nhóm chỉ thêm theo nhóm (một khối), Part câu đơn chỉ thêm từng câu
    if (questionIds.length > 0 && rule.group === 'required') {
      throw fieldError('questionIds', `${partName} gồm các nhóm câu, hãy thêm theo nhóm`);
    }
    if (groupIds.length > 0 && rule.group === 'none') {
      throw fieldError('groupIds', `${partName} là câu đơn, không thêm theo nhóm`);
    }

    const ids = [
      ...(await this.collectSingles(questionIds, section, partName)),
      ...(await this.collectGroups(groupIds, section, partName)),
    ];

    // Không trùng câu trong cả đề, kể cả ở phần thi khác (UC Tạo đề, luồng thay thế 2)
    const duplicates = await this.prisma.examQuestion.findMany({
      where: { questionId: { in: ids }, section: { examId } },
      select: { questionId: true },
    });
    if (duplicates.length > 0) {
      throw new AppException(
        ErrorCode.EXAM_QUESTION_DUPLICATE,
        `${duplicates.length} câu đã có trong đề, không thêm lại`,
        { questionIds: duplicates.map((item) => item.questionId) },
      );
    }

    // Nối vào cuối phần thi, giữ đúng thứ tự gửi lên và thứ tự trong nhóm
    const last = await this.prisma.examQuestion.aggregate({
      where: { sectionId },
      _max: { orderIndex: true },
    });
    const start = (last._max.orderIndex ?? -1) + 1;

    await mapUnique(
      () =>
        this.prisma.$transaction([
          this.prisma.examQuestion.createMany({
            data: ids.map((questionId, index) => ({
              sectionId,
              questionId,
              orderIndex: start + index,
            })),
          }),
          this.touch(examId),
        ]),
      ErrorCode.EXAM_QUESTION_DUPLICATE,
    );
    return this.exams.get(examId, user);
  }

  /** Câu thuộc nhóm thì gỡ cả khối (mọi câu cùng nhóm trong phần thi) để nhóm không bị thiếu câu */
  async removeQuestion(
    examId: string,
    sectionId: string,
    examQuestionId: string,
    user: AuthUser,
  ): Promise<ExamDetail> {
    await this.loadEditable(examId, user);
    await this.loadSection(examId, sectionId);

    const item = await this.prisma.examQuestion.findFirst({
      where: { id: examQuestionId, sectionId },
      select: { id: true, question: { select: { groupId: true } } },
    });
    if (!item) throw new AppException(ErrorCode.EXAM_QUESTION_NOT_FOUND);

    const groupId = item.question.groupId;
    await this.prisma.$transaction([
      this.prisma.examQuestion.deleteMany({
        where: groupId ? { sectionId, question: { groupId } } : { id: item.id },
      }),
      this.touch(examId),
    ]);
    return this.exams.get(examId, user);
  }

  /**
   * Câu đơn: còn trong ngân hàng, đúng kỹ năng + Part của phần thi, không ở trạng thái Ngừng dùng.
   * Rút đề tự động (ExamAutoFillService) dùng lại để kiểm tra giống hệt khi thêm tay
   */
  async collectSingles(ids: string[], section: SectionRef, partName: string): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.question.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, skill: true, part: true, status: true, content: true },
    });
    if (rows.length !== ids.length) {
      throw fieldError('questionIds', 'Có câu hỏi không tồn tại hoặc đã bị xóa');
    }

    for (const question of rows) {
      const name = `Câu "${excerpt(question.content)}"`;
      if (question.skill !== section.skill || question.part !== section.part) {
        throw fieldError('questionIds', `${name} không thuộc ${partName}`);
      }
      // Câu Nháp vẫn thêm được để soạn dần; khi xuất bản mới bắt buộc Đang dùng
      if (question.status === QuestionStatus.INACTIVE) {
        throw fieldError('questionIds', `${name} đã ngừng dùng`);
      }
    }
    return ids; // giữ đúng thứ tự gửi lên
  }

  /** Nhóm câu: thêm toàn bộ câu còn hiệu lực của nhóm, theo thứ tự trong nhóm */
  async collectGroups(ids: string[], section: SectionRef, partName: string): Promise<string[]> {
    if (ids.length === 0) return [];
    const groups = await this.prisma.questionGroup.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: {
        id: true,
        skill: true,
        part: true,
        status: true,
        topic: { select: { name: true } },
        questions: {
          where: { deletedAt: null },
          orderBy: { orderInGroup: 'asc' },
          select: { id: true },
        },
      },
    });
    if (groups.length !== ids.length) {
      throw fieldError('groupIds', 'Có nhóm câu không tồn tại hoặc đã bị xóa');
    }

    const byId = new Map(groups.map((group) => [group.id, group]));
    const result: string[] = [];
    for (const id of ids) {
      const group = byId.get(id);
      if (!group) continue; // đã kiểm tra đủ số lượng ở trên
      const name = `Nhóm "${group.topic.name}"`;
      if (group.skill !== section.skill || group.part !== section.part) {
        throw fieldError('groupIds', `${name} không thuộc ${partName}`);
      }
      if (group.status === QuestionStatus.INACTIVE) {
        throw fieldError('groupIds', `${name} đã ngừng dùng`);
      }
      if (group.questions.length === 0) {
        throw fieldError('groupIds', `${name} chưa có câu hỏi`);
      }
      result.push(...group.questions.map((question) => question.id));
    }
    return result;
  }
}
