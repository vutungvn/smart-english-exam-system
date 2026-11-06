import type { PaperSection } from '@/api/generated';
import { cn } from '@/lib/utils';
import { isAnswered } from './attempt-progress';
import type { LocalAnswer } from './use-answer-sync';

interface QuestionNavigatorProps {
  sections: PaperSection[];
  answers: Record<string, LocalAnswer>;
  /** Câu Speaking đã ghi âm */
  recorded?: ReadonlySet<string>;
  activeId?: string;
  onJump: (sectionIndex: number, examQuestionId: string) => void;
}

/** Bảng số câu theo Part: đã làm (xanh), đánh dấu (viền cam), câu đang xem (vòng sáng) */
export function QuestionNavigator({
  sections,
  answers,
  recorded,
  activeId,
  onJump,
}: QuestionNavigatorProps) {
  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.id}>
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-subtle uppercase">
            {section.skill.charAt(0) + section.skill.slice(1).toLowerCase()} · Part {section.part}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {section.blocks.flatMap((block) =>
              block.questions.map((question) => {
                const answer = answers[question.examQuestionId];
                const done = isAnswered(question, answer, recorded);
                const flagged = answer?.isFlagged ?? false;
                return (
                  <button
                    key={question.examQuestionId}
                    type="button"
                    onClick={() => onJump(sectionIndex, question.examQuestionId)}
                    aria-label={`Câu ${question.number}${done ? ', đã làm' : ''}${flagged ? ', đã đánh dấu' : ''}`}
                    className={cn(
                      'relative flex size-9 items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-colors',
                      done
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-white text-slate-600 hover:border-primary/40',
                      flagged && 'ring-2 ring-amber-400 ring-offset-1',
                      activeId === question.examQuestionId &&
                        'outline-2 outline-offset-2 outline-brand',
                    )}
                  >
                    {question.number}
                    {flagged && (
                      <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      ))}

      <ul className="space-y-1.5 border-t border-border pt-3 text-xs text-slate-600">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded bg-primary" /> Đã làm
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded border border-border ring-2 ring-amber-400" /> Đánh dấu
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded border border-border bg-white" /> Chưa làm
        </li>
      </ul>
    </div>
  );
}
