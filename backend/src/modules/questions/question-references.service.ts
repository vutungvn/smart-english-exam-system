import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import type { Skill } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

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
