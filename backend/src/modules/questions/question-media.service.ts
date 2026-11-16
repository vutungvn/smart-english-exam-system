import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { InMemoryFile } from '../../common/types/in-memory-file.js';
import type { Skill } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { QUESTION_MEDIA_KEY_PREFIX, QUESTION_MEDIA_TYPES } from '../media/media.constants.js';
import { QuestionGroupsService } from './question-groups.service.js';
import {
  groupMediaRule,
  MEDIA_LABEL,
  MEDIA_LIMITS,
  questionMediaRule,
  sniffMedia,
  type MediaKind,
  type MediaRule,
} from './question-media.js';
import { assertOwner, QuestionReferencesService } from './question-references.service.js';
import { QuestionsService } from './questions.service.js';
import type { QuestionDetail, QuestionGroupDetail } from './questions.types.js';
import { describePart, findPartRule } from './toeic-parts.js';

const MB = 1024 * 1024;

interface Target {
  authorId: string;
  skill: Skill;
  part: number;
  audioKey: string | null;
  imageKey: string | null;
}

type Owner = 'question' | 'group';

const keyColumn = (kind: MediaKind) => (kind === 'audio' ? 'audioKey' : 'imageKey');

/**
 * Tải audio/ảnh lên cho một câu hoặc một nhóm câu ngay trong form (ngoài cách nhập tệp .zip).
 * Mỗi câu/nhóm có tối đa 1 audio và 1 ảnh: tải tệp mới thì thay tệp cũ. Cùng quy tắc với nhập tệp:
 * Part được phép, định dạng theo nội dung tệp, dung lượng.
 */
@Injectable()
export class QuestionMediaService {
  private readonly logger = new Logger(QuestionMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly questions: QuestionsService,
    private readonly groups: QuestionGroupsService,
    private readonly refs: QuestionReferencesService,
  ) {}

  async uploadToQuestion(
    id: string,
    kind: MediaKind,
    file: InMemoryFile | undefined,
    user: AuthUser,
  ): Promise<QuestionDetail> {
    const target = await this.loadQuestion(id, user);
    // Âm thanh, hình ảnh học viên nghe/xem khi làm bài: khóa khi câu đang được làm bài (D29)
    await this.refs.assertContentUnlocked([id], [kind]);
    await this.replace('question', id, target, kind, file, questionMediaRule);
    return this.questions.get(id);
  }

  async removeFromQuestion(id: string, kind: MediaKind, user: AuthUser): Promise<QuestionDetail> {
    const target = await this.loadQuestion(id, user);
    if (target[keyColumn(kind)]) await this.refs.assertContentUnlocked([id], [kind]);
    await this.clear('question', id, target, kind);
    return this.questions.get(id);
  }

  async uploadToGroup(
    id: string,
    kind: MediaKind,
    file: InMemoryFile | undefined,
    user: AuthUser,
  ): Promise<QuestionGroupDetail> {
    const target = await this.loadGroup(id, user);
    await this.refs.assertContentUnlocked(await this.groups.questionIds(id), [kind], 'group');
    await this.replace('group', id, target, kind, file, groupMediaRule);
    return this.groups.get(id);
  }

  async removeFromGroup(id: string, kind: MediaKind, user: AuthUser): Promise<QuestionGroupDetail> {
    const target = await this.loadGroup(id, user);
    if (target[keyColumn(kind)]) {
      await this.refs.assertContentUnlocked(await this.groups.questionIds(id), [kind], 'group');
    }
    await this.clear('group', id, target, kind);
    return this.groups.get(id);
  }

  private async loadQuestion(id: string, user: AuthUser): Promise<Target> {
    const row = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true, skill: true, part: true, audioKey: true, imageKey: true },
    });
    if (!row) throw new AppException(ErrorCode.QUESTION_NOT_FOUND);
    assertOwner(row.authorId, user.id);
    return row;
  }

  private async loadGroup(id: string, user: AuthUser): Promise<Target> {
    const row = await this.prisma.questionGroup.findFirst({
      where: { id, deletedAt: null },
      select: { authorId: true, skill: true, part: true, audioKey: true, imageKey: true },
    });
    if (!row) throw new AppException(ErrorCode.QUESTION_GROUP_NOT_FOUND);
    assertOwner(row.authorId, user.id);
    return row;
  }

  private async replace(
    owner: Owner,
    id: string,
    target: Target,
    kind: MediaKind,
    file: InMemoryFile | undefined,
    ruleOf: (kind: MediaKind, skill: Skill, part: number) => MediaRule,
  ): Promise<void> {
    if (!ruleOf(kind, target.skill, target.part).allowed) {
      const rule = findPartRule(target.skill, target.part);
      const name = rule ? describePart(rule) : `Part ${target.part}`;
      throw fieldError(
        'kind',
        `${owner === 'group' ? 'Nhóm ' : ''}${name} không dùng tệp ${MEDIA_LABEL[kind]}`,
      );
    }
    if (!file) throw new AppException(ErrorCode.MEDIA_INVALID_FILE, 'Vui lòng chọn một tệp');
    if (file.size > MEDIA_LIMITS[kind]) {
      throw new AppException(
        ErrorCode.MEDIA_INVALID_FILE,
        `Tệp ${MEDIA_LABEL[kind]} tối đa ${MEDIA_LIMITS[kind] / MB} MB`,
      );
    }
    const sniffed = await sniffMedia(file.buffer);
    if (!sniffed || sniffed.kind !== kind) {
      throw new AppException(
        ErrorCode.MEDIA_INVALID_FILE,
        kind === 'audio'
          ? 'Tệp âm thanh phải là MP3 (kiểm tra theo nội dung, đổi đuôi tệp không được)'
          : 'Ảnh phải là JPG, PNG hoặc WebP (kiểm tra theo nội dung, đổi đuôi tệp không được)',
      );
    }

    const key = `${QUESTION_MEDIA_KEY_PREFIX}${randomUUID()}.${sniffed.ext}`;
    await this.storage.save(key, file.buffer, { contentType: QUESTION_MEDIA_TYPES[sniffed.ext] });
    try {
      await this.setKey(owner, id, kind, key);
    } catch (error) {
      // Không ghi được DB thì dọn tệp vừa lưu, tránh tệp mồ côi
      await this.deleteQuietly(key);
      throw error;
    }
    await this.deleteIfUnused(target[keyColumn(kind)]);
  }

  private async clear(owner: Owner, id: string, target: Target, kind: MediaKind): Promise<void> {
    const old = target[keyColumn(kind)];
    if (!old) return;
    await this.setKey(owner, id, kind, null);
    await this.deleteIfUnused(old);
  }

  private async setKey(owner: Owner, id: string, kind: MediaKind, key: string | null) {
    const data = { [keyColumn(kind)]: key };
    // updateMany + deletedAt: null: câu/nhóm vừa bị xóa ở tab khác thì báo không tìm thấy
    const { count } =
      owner === 'question'
        ? await this.prisma.question.updateMany({ where: { id, deletedAt: null }, data })
        : await this.prisma.questionGroup.updateMany({ where: { id, deletedAt: null }, data });
    if (count === 0) {
      throw new AppException(
        owner === 'question' ? ErrorCode.QUESTION_NOT_FOUND : ErrorCode.QUESTION_GROUP_NOT_FOUND,
      );
    }
  }

  /**
   * Nhập .zip cho phép nhiều câu dùng chung một tệp: chỉ xóa tệp trong kho khi không còn câu hay nhóm
   * nào (kể cả đã xóa mềm, vì bài làm cũ vẫn xem lại được) trỏ tới nó
   */
  private async deleteIfUnused(key: string | null): Promise<void> {
    if (!key) return;
    const [questions, groups] = await Promise.all([
      this.prisma.question.count({ where: { OR: [{ audioKey: key }, { imageKey: key }] } }),
      this.prisma.questionGroup.count({ where: { OR: [{ audioKey: key }, { imageKey: key }] } }),
    ]);
    if (questions + groups === 0) await this.deleteQuietly(key);
  }

  // Xóa tệp cũ là việc dọn dẹp: lỗi thì ghi log, không làm hỏng thao tác chính đã thành công
  private async deleteQuietly(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch {
      this.logger.warn(`Không xóa được tệp ${key}, cần dọn tay`);
    }
  }
}
