import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { QuestionType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { examPaperSelect, type ExamPaperRow } from './exams.mapper.js';

/** Đề kèm các cột kiểm tra lúc bắt đầu làm bài (đề còn mở, giới hạn lượt, luyện theo Part) */
const cachedExamSelect = {
  ...examPaperSelect,
  kind: true,
  status: true,
  deletedAt: true,
  maxAttempts: true,
  allowPartPractice: true,
  shuffleQuestions: true,
} satisfies Prisma.ExamSelect;

type CachedExamRow = Prisma.ExamGetPayload<{ select: typeof cachedExamSelect }>;

/** Giữ đề trong bộ nhớ tối đa 10 phút; thao tác ghi của giáo viên, quản trị xóa sớm hơn */
const TTL_MS = 10 * 60 * 1000;
/** Số đề giữ cùng lúc; vượt thì bỏ đề nạp sớm nhất */
const MAX_EXAMS = 50;

/** Câu trong đề: thuộc Part nào, loại câu, id các phương án (kiểm tra câu trả lời khi tự động lưu) */
export interface PaperTarget {
  sectionId: string;
  type: QuestionType;
  optionIds: ReadonlySet<string>;
  /** Speaking: thời gian trả lời tối đa, dùng kiểm tra độ dài bài nói tải lên */
  responseSeconds: number | null;
}

export interface CachedPaper {
  exam: Pick<
    CachedExamRow,
    'kind' | 'status' | 'deletedAt' | 'maxAttempts' | 'allowPartPractice' | 'shuffleQuestions'
  >;
  /** Đề như examPaperSelect (không có đáp án). Dùng chung mọi request: không được sửa trực tiếp */
  paper: ExamPaperRow;
  /** examQuestionId → câu */
  targets: ReadonlyMap<string, PaperTarget>;
}

interface Entry {
  loadedAt: number;
  value: Promise<CachedPaper | null>;
}

function toCached({
  kind,
  status,
  deletedAt,
  maxAttempts,
  allowPartPractice,
  shuffleQuestions,
  ...paper
}: CachedExamRow): CachedPaper {
  const targets = new Map<string, PaperTarget>();
  for (const section of paper.sections) {
    for (const item of section.questions) {
      targets.set(item.id, {
        sectionId: section.id,
        type: item.question.type,
        optionIds: new Set(item.question.options.map((option) => option.id)),
        responseSeconds: item.question.responseSeconds,
      });
    }
  }
  return {
    exam: { kind, status, deletedAt, maxAttempts, allowPartPractice, shuffleQuestions },
    paper,
    targets,
  };
}

/**
 * Cache đề cho học viên làm bài (SPRINT-101). Mọi học viên làm cùng một đề nhận cùng nội dung, nên
 * chỉ đọc DB một lần cho mỗi đề thay vì mỗi lần bắt đầu, mở lại bài hay tự động lưu. Yêu cầu đến
 * trong lúc đề đang nạp dùng chung một lần đọc (200 học viên bấm "Bắt đầu" cùng lúc: 1 lần đọc DB).
 * Bộ nhớ tiến trình là đủ khi chạy một máy chủ; chạy nhiều máy chủ thì chuyển sang Redis.
 */
@Injectable()
export class PaperCacheService {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly prisma: PrismaService) {}

  /** null khi đề không tồn tại */
  get(examId: string): Promise<CachedPaper | null> {
    const now = Date.now();
    const hit = this.entries.get(examId);
    if (hit && now - hit.loadedAt < TTL_MS) return hit.value;

    const value = this.prisma.exam
      .findUnique({ where: { id: examId }, select: cachedExamSelect })
      .then((paper) => paper && toCached(paper));
    this.entries.delete(examId);
    this.entries.set(examId, { loadedAt: now, value });
    // Đọc lỗi thì bỏ khỏi cache để lần sau đọc lại
    value.catch(() => {
      if (this.entries.get(examId)?.value === value) this.entries.delete(examId);
    });
    if (this.entries.size > MAX_EXAMS) {
      this.entries.delete(this.entries.keys().next().value as string);
    }
    return value;
  }

  /** Xóa toàn bộ: nội dung câu, nhóm, đề có thể đã đổi */
  clear(): void {
    this.entries.clear();
  }
}
