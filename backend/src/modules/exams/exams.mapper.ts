import type { Prisma } from '../../generated/prisma/client.js';
import type { Skill } from '../../generated/prisma/enums.js';
import type { MediaUrlService } from '../media/media-url.service.js';
import { questionSummarySelect, toQuestionSummary } from '../questions/questions.mapper.js';
import { findPartRule } from '../questions/toeic-parts.js';
import type {
  ExamDetail,
  ExamPaper,
  ExamSummary,
  PaperBlock,
  PaperSection,
} from './exams.types.js';

// select khai báo một lần như questions.mapper.ts: response luôn cùng hình dạng,
// không bao giờ lỡ trả cột nội bộ (author_id, deleted_at)

const examBaseSelect = {
  id: true,
  kind: true,
  title: true,
  description: true,
  scoringScale: true,
  durationMinutes: true,
  maxAttempts: true,
  allowPartPractice: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  subject: { select: { id: true, code: true, name: true } },
} satisfies Prisma.ExamSelect;

const sectionOrder = { orderIndex: 'asc' } as const;

export const examSummarySelect = {
  ...examBaseSelect,
  // Đếm câu theo từng phần thi trong DB (một đề tối đa 15 phần), không tải danh sách câu
  sections: { select: { _count: { select: { questions: true } } } },
} satisfies Prisma.ExamSelect;

export const examDetailSelect = {
  ...examBaseSelect,
  sections: {
    orderBy: sectionOrder,
    select: {
      id: true,
      skill: true,
      part: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: { id: true, orderIndex: true, question: { select: questionSummarySelect } },
      },
    },
  },
} satisfies Prisma.ExamSelect;

/** Dữ liệu cho kiểm tra điều kiện xuất bản (exam-check.ts) */
export const examCheckSelect = {
  id: true,
  status: true,
  scoringScale: true,
  durationMinutes: true,
  sections: {
    orderBy: sectionOrder,
    select: {
      id: true,
      skill: true,
      part: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          question: {
            select: {
              id: true,
              content: true,
              status: true,
              deletedAt: true,
              audioKey: true,
              imageKey: true,
              group: {
                select: {
                  id: true,
                  status: true,
                  audioKey: true,
                  topic: { select: { name: true } },
                  _count: { select: { questions: { where: { deletedAt: null } } } },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ExamSelect;

/** Đề cho học viên: KHÔNG chọn isCorrect, sampleAnswer, explanation, transcript */
export const examPaperSelect = {
  id: true,
  title: true,
  scoringScale: true,
  durationMinutes: true,
  sections: {
    orderBy: sectionOrder,
    select: {
      id: true,
      skill: true,
      part: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          question: {
            select: {
              type: true,
              content: true,
              audioKey: true,
              imageKey: true,
              prepSeconds: true,
              responseSeconds: true,
              options: {
                orderBy: { orderIndex: 'asc' },
                select: { id: true, label: true, content: true },
              },
              group: { select: { id: true, passage: true, audioKey: true, imageKey: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ExamSelect;

type ExamSummaryRow = Prisma.ExamGetPayload<{ select: typeof examSummarySelect }>;
type ExamDetailRow = Prisma.ExamGetPayload<{ select: typeof examDetailSelect }>;
export type ExamCheckRow = Prisma.ExamGetPayload<{ select: typeof examCheckSelect }>;
export type ExamPaperRow = Prisma.ExamGetPayload<{ select: typeof examPaperSelect }>;

function partName(skill: Skill, part: number): string {
  return findPartRule(skill, part)?.name ?? `Part ${part}`;
}

export function toExamSummary({ sections, ...row }: ExamSummaryRow): ExamSummary {
  return {
    ...row,
    sectionCount: sections.length,
    questionCount: sections.reduce((sum, section) => sum + section._count.questions, 0),
  };
}

export function toExamDetail({ sections, ...row }: ExamDetailRow): ExamDetail {
  const items = sections.map((section) => ({
    id: section.id,
    skill: section.skill,
    part: section.part,
    name: partName(section.skill, section.part),
    questionCount: section.questions.length,
    questions: section.questions.map((item) => ({
      id: item.id,
      orderIndex: item.orderIndex,
      question: toQuestionSummary(item.question),
    })),
  }));

  return {
    ...row,
    sectionCount: items.length,
    questionCount: items.reduce((sum, section) => sum + section.questionCount, 0),
    sections: items,
  };
}

/** Đánh số câu liên tục cả đề; các câu liền nhau cùng nhóm gom vào một khối */
export function toExamPaper({ sections, ...row }: ExamPaperRow, media: MediaUrlService): ExamPaper {
  let number = 0;

  const paperSections: PaperSection[] = sections.map((section) => {
    const blocks: PaperBlock[] = [];

    for (const item of section.questions) {
      const { group, ...question } = item.question;
      const paperQuestion = media.withUrls({
        ...question,
        number: ++number,
        examQuestionId: item.id,
      });
      const last = blocks.at(-1);

      if (group && last?.group?.id === group.id) last.questions.push(paperQuestion);
      else blocks.push({ group: group && media.withUrls(group), questions: [paperQuestion] });
    }

    return {
      id: section.id,
      skill: section.skill,
      part: section.part,
      name: partName(section.skill, section.part),
      blocks,
    };
  });

  return { ...row, totalQuestions: number, sections: paperSections };
}
