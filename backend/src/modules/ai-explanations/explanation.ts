import { createHash } from 'node:crypto';
import { z } from 'zod';
import { Skill } from '../../generated/prisma/enums.js';
import { describePart, findPartRule } from '../questions/toeic-parts.js';

/** Đổi prompt hoặc cấu trúc kết quả thì tăng số này: mọi lời giải thích cũ được sinh lại */
export const EXPLANATION_VERSION = 1;

/** Dữ liệu câu hỏi đưa vào prompt; không có gì về học viên */
export interface ExplainSource {
  skill: Skill;
  part: number;
  content: string;
  /** Giải thích của giáo viên, dùng làm tham khảo */
  explanation: string | null;
  imageKey: string | null;
  options: { label: string; content: string; isCorrect: boolean }[];
  group: { passage: string | null; transcript: string | null; imageKey: string | null } | null;
}

/** Kết quả AI phải có đúng một mục cho mỗi phương án của câu */
export function explanationSchema(labels: readonly string[]) {
  return z.object({
    summary: z.string().min(1).max(2000).describe('Vì sao đáp án đúng là đúng, 2–4 câu tiếng Việt'),
    options: z
      .array(
        z.object({
          label: z.enum(labels as [string, ...string[]]),
          reason: z
            .string()
            .min(1)
            .max(1000)
            .describe('Vì sao phương án này đúng hoặc sai, chỉ ra bẫy nếu có; 1–2 câu tiếng Việt'),
        }),
      )
      .length(labels.length)
      .refine(
        (items) => new Set(items.map((item) => item.label)).size === items.length,
        'Mỗi phương án chỉ một mục',
      )
      .describe('Mỗi phương án đúng một mục, theo thứ tự A, B, C, D'),
    keyPoints: z
      .array(
        z.object({
          term: z.string().min(1).max(120).describe('Từ, cụm từ hoặc điểm ngữ pháp tiếng Anh'),
          note: z.string().min(1).max(500).describe('Nghĩa và cách dùng, tiếng Việt'),
        }),
      )
      .max(5),
    tip: z.string().max(600).describe('Mẹo làm dạng câu này, 1–2 câu tiếng Việt'),
  });
}

export type ExplanationContent = z.infer<ReturnType<typeof explanationSchema>>;

/** Đổi nội dung câu, phương án, đáp án đúng, đoạn văn, lời thoại, ảnh thì mã băm đổi */
export function contentHashOf(source: ExplainSource): string {
  const data = [
    EXPLANATION_VERSION,
    source.skill,
    source.part,
    source.content,
    source.explanation,
    source.imageKey,
    source.options.map((option) => [option.label, option.content, option.isCorrect]),
    source.group && [source.group.passage, source.group.transcript, source.group.imageKey],
  ];
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export const EXPLANATION_SYSTEM = [
  'You are a TOEIC tutor for Vietnamese learners.',
  'Explain the given multiple-choice question in Vietnamese. Keep English words, phrases and quotes from the question in English.',
  'Base the explanation only on the provided material (photo, transcript, passage, question, options). Never invent dialogue or facts that are not in the material.',
  'The correct answer is given and final: explain why it is correct, never argue with it.',
  'For each option, briefly say why it is correct or wrong, naming the trap when there is one (similar sound, wrong detail, wrong tense, wrong word form...).',
  'Be concise and friendly, no long introduction.',
].join('\n');

export function explanationPrompt(source: ExplainSource, hasImage: boolean): string {
  const rule = findPartRule(source.skill, source.part);
  const lines = [
    `Question type: TOEIC ${rule ? describePart(rule) : `${source.skill} Part ${source.part}`}`,
  ];
  if (source.skill === Skill.LISTENING) {
    lines.push('This is a listening question: the text below was spoken in the audio.');
  }
  if (hasImage) lines.push('The photo or graphic of the question is attached.');
  if (source.group?.transcript) lines.push('', 'Audio transcript:', source.group.transcript);
  if (source.group?.passage) lines.push('', 'Passage:', source.group.passage);
  lines.push('', 'Question:', source.content);
  lines.push('', 'Options:', ...source.options.map((o) => `${o.label}. ${o.content}`));
  const correct = source.options.find((option) => option.isCorrect);
  lines.push('', `Correct answer: ${correct?.label ?? 'unknown'}`);
  if (source.explanation) {
    lines.push('', "Teacher's note (Vietnamese, use as reference):", source.explanation);
  }
  return lines.join('\n');
}

/** Kết quả mẫu khi chưa có GEMINI_API_KEY, đủ để thử giao diện */
export function fakeExplanation(source: ExplainSource): ExplanationContent {
  const correct = source.options.find((option) => option.isCorrect)?.label ?? '?';
  return {
    summary: `[Dữ liệu mẫu, chưa gọi AI] Đáp án đúng là ${correct}.`,
    options: source.options.map((option) => ({
      label: option.label,
      reason: option.isCorrect ? 'Phương án đúng (dữ liệu mẫu).' : 'Phương án sai (dữ liệu mẫu).',
    })),
    keyPoints: [{ term: 'sample', note: 'Ví dụ ghi chú từ vựng (dữ liệu mẫu).' }],
    tip: 'Đặt GEMINI_API_KEY trong .env để có lời giải thích thật.',
  };
}
