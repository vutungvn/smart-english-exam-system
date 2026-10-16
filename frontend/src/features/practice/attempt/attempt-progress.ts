import type { PaperQuestion, PaperSection } from '@/api/generated';
import type { LocalAnswer } from './use-answer-sync';

/** Câu "đã làm": đã chọn phương án hoặc đã viết (chỉ đánh dấu thì chưa tính) */
export function isAnswered(answer: LocalAnswer | undefined): boolean {
  return Boolean(answer?.selectedOptionId || answer?.textAnswer?.trim());
}

export function allQuestions(sections: PaperSection[]): PaperQuestion[] {
  return sections.flatMap((section) => section.blocks.flatMap((block) => block.questions));
}

/** Tổng hợp cho bảng câu hỏi và hộp thoại nộp bài. Câu Speaking chưa trả lời được nên không đếm */
export function progressOf(sections: PaperSection[], answers: Record<string, LocalAnswer>) {
  const questions = allQuestions(sections);
  const answerable = questions.filter((q) => q.type !== 'SPOKEN_RESPONSE');
  const answered = answerable.filter((q) => isAnswered(answers[q.examQuestionId])).length;
  return {
    total: answerable.length,
    answered,
    blank: answerable.length - answered,
    flagged: questions.filter((q) => answers[q.examQuestionId]?.isFlagged).length,
    speaking: questions.length - answerable.length,
  };
}
