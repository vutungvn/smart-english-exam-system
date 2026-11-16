import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import { AttemptMode, AttemptStatus, ExamStatus } from '../../generated/prisma/enums.js';
import type { Skill } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { describeLockedFields, type LockedField } from './content-lock.js';
import type { ContentLock } from './questions.types.js';

// Các kiểm tra cần đọc DB, dùng chung cho câu hỏi và nhóm câu

/** Ngân hàng câu hỏi dùng chung: giáo viên nào cũng xem được, nhưng chỉ người tạo được sửa/xóa */
export function assertOwner(authorId: string, userId: string): void {
  if (authorId !== userId) {
    throw new AppException(ErrorCode.FORBIDDEN, 'Chỉ giáo viên tạo ra mới được sửa hoặc xóa');
  }
}

@Injectable()
export class QuestionReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Chủ đề phải tồn tại, thuộc chương trình thi đang dùng, đúng kỹ năng và Part */
  async assertTopic(topicId: string, skill: Skill, part: number): Promise<void> {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, subject: { isActive: true } },
      select: { name: true, skill: true, parts: true },
    });

    if (!topic) throw fieldError('topicId', 'Chủ đề không tồn tại');
    if (topic.skill !== skill) {
      throw fieldError('topicId', `Chủ đề "${topic.name}" thuộc kỹ năng ${topic.skill}`);
    }
    if (!topic.parts.includes(part)) {
      throw fieldError(
        'topicId',
        `Chủ đề "${topic.name}" chỉ dùng cho Part ${topic.parts.join(', ')}`,
      );
    }
  }

  /**
   * Các câu (trong danh sách) đang nằm trong một đề đã xuất bản: không được xóa, vì đề xuất bản
   * phải giữ nguyên bộ câu cho bài làm của học viên (D23)
   */
  async publishedQuestionIds(questionIds: string[]): Promise<Set<string>> {
    if (questionIds.length === 0) return new Set();
    const rows = await this.prisma.examQuestion.findMany({
      where: {
        questionId: { in: questionIds },
        section: { exam: { status: ExamStatus.PUBLISHED, deletedAt: null } },
      },
      select: { questionId: true },
      distinct: ['questionId'],
    });
    return new Set(rows.map((row) => row.questionId));
  }

  /**
   * Các câu (trong danh sách) đang được làm bài (D29): nằm trong đề đang xuất bản, hoặc trong đề đã
   * gỡ nhưng còn bài làm cả đề đang dở. Bài luyện theo Part không đếm giờ nên không tính (có thể để
   * dở mãi). null khi không bị khóa
   */
  async contentLock(questionIds: string[]): Promise<ContentLock | null> {
    if (questionIds.length === 0) return null;
    const exams = await this.prisma.exam.findMany({
      where: {
        deletedAt: null,
        sections: { some: { questions: { some: { questionId: { in: questionIds } } } } },
        OR: [
          { status: ExamStatus.PUBLISHED },
          { attempts: { some: { status: AttemptStatus.IN_PROGRESS, mode: AttemptMode.FULL } } },
        ],
      },
      orderBy: { title: 'asc' },
      select: { id: true, title: true, status: true },
    });
    if (exams.length === 0) return null;
    const published = exams.filter((exam) => exam.status === ExamStatus.PUBLISHED);
    return published.length > 0
      ? { reason: 'PUBLISHED_EXAM', exams: published.map(({ id, title }) => ({ id, title })) }
      : { reason: 'ACTIVE_ATTEMPT', exams: exams.map(({ id, title }) => ({ id, title })) };
  }

  /**
   * Sửa trường bị khóa của câu, nhóm đang được làm bài: 409 kèm đề đang khóa và các trường đã đổi.
   * questionIds: câu đang sửa, hoặc các câu của nhóm đang sửa
   */
  async assertContentUnlocked(
    questionIds: string[],
    fields: LockedField[],
    target: 'question' | 'group' = 'question',
  ): Promise<void> {
    if (fields.length === 0) return;
    const lock = await this.contentLock(questionIds);
    if (!lock) return;
    const exams = lock.exams.map((exam) => `«${exam.title}»`).join(', ');
    const what = describeLockedFields(fields);
    const details = { fields, exams: lock.exams };
    if (lock.reason === 'PUBLISHED_EXAM') {
      throw new AppException(
        ErrorCode.QUESTION_IN_PUBLISHED_EXAM,
        `${target === 'question' ? 'Câu' : 'Nhóm câu'} đang nằm trong đề đã xuất bản ${exams} ` +
          `nên không sửa được ${what}. Hãy gỡ xuất bản đề trước khi sửa`,
        details,
      );
    }
    throw new AppException(
      ErrorCode.QUESTION_IN_ACTIVE_ATTEMPT,
      `Đang có học viên làm đề ${exams} có ${target === 'question' ? 'câu' : 'nhóm'} này ` +
        `nên chưa sửa được ${what}. Hãy chờ các bài làm nộp xong`,
      details,
    );
  }

  /** Câu muốn vào nhóm: nhóm còn hiệu lực, do chính giáo viên này tạo, cùng kỹ năng và Part */
  async assertGroupForQuestion(
    groupId: string,
    userId: string,
    skill: Skill,
    part: number,
  ): Promise<void> {
    const group = await this.prisma.questionGroup.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { authorId: true, skill: true, part: true },
    });

    if (!group) throw fieldError('groupId', 'Nhóm câu không tồn tại');
    if (group.authorId !== userId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Chỉ thêm câu vào nhóm do bạn tạo');
    }
    if (group.skill !== skill || group.part !== part) {
      throw fieldError(
        'groupId',
        `Nhóm câu thuộc ${group.skill} Part ${group.part}, khác với câu hỏi`,
      );
    }
  }
}
