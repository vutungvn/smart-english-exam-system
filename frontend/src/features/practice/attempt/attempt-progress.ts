import type { PaperQuestion, PaperSection } from '@/api/generated';
import type { LocalAnswer } from './use-answer-sync';

const NONE: ReadonlySet<string> = new Set();

/** Câu "đã làm": đã chọn phương án, đã viết hoặc đã ghi âm (chỉ đánh dấu thì chưa tính) */
export function isAnswered(
  question: Pick<PaperQuestion, 'examQuestionId' | 'type'>,
  answer: LocalAnswer | undefined,
  recorded: ReadonlySet<string> = NONE,
): boolean {
  if (question.type === 'SPOKEN_RESPONSE') return recorded.has(question.examQuestionId);
  return Boolean(answer?.selectedOptionId || answer?.textAnswer?.trim());
}

export function allQuestions(sections: PaperSection[]): PaperQuestion[] {
  return sections.flatMap((section) => section.blocks.flatMap((block) => block.questions));
}

/** Tổng hợp cho bảng câu hỏi và hộp thoại nộp bài; câu Speaking tính là đã làm khi đã ghi âm */
export function progressOf(
  sections: PaperSection[],
  answers: Record<string, LocalAnswer>,
  recorded: ReadonlySet<string> = NONE,
) {
  const questions = allQuestions(sections);
  const answered = questions.filter((q) =>
    isAnswered(q, answers[q.examQuestionId], recorded),
  ).length;
  return {
    total: questions.length,
    answered,
    blank: questions.length - answered,
    flagged: questions.filter((q) => answers[q.examQuestionId]?.isFlagged).length,
  };
}
