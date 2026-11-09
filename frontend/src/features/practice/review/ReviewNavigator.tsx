import type { ReviewSection } from '@/api/generated';
import { cn } from '@/lib/utils';
import { OUTCOME_META, questionCell } from './review-meta';

interface ReviewNavigatorProps {
  sections: ReviewSection[];
  onJump: (examQuestionId: string) => void;
}

/** Bảng số câu theo Part, tô màu theo kết quả; chấm cam ở góc là câu đã đánh dấu */
export function ReviewNavigator({ sections, onJump }: ReviewNavigatorProps) {
  // Chú thích chỉ gồm các loại kết quả có trong bài (đề Writing không có Đúng/Sai)
  const present = new Set(
    sections.flatMap((section) =>
      section.blocks.flatMap((block) => block.questions.map((question) => question.outcome)),
    ),
  );
  const legend = (['CORRECT', 'WRONG', 'SCORED', 'PENDING', 'FAILED', 'SKIPPED'] as const).filter(
    (outcome) => present.has(outcome),
  );
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id}>
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-subtle uppercase">
            {section.skill.charAt(0) + section.skill.slice(1).toLowerCase()} · Part {section.part}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {section.blocks.flatMap((block) =>
              block.questions.map((question) => {
                const meta = OUTCOME_META[question.outcome];
                return (
                  <button
                    key={question.examQuestionId}
                    type="button"
                    onClick={() => onJump(question.examQuestionId)}
                    aria-label={`Câu ${question.number}, ${meta.label.toLowerCase()}${question.isFlagged ? ', đã đánh dấu' : ''}`}
                    className={cn(
                      'relative flex size-9 items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-opacity hover:opacity-80',
                      questionCell(question),
                    )}
                  >
                    {question.number}
                    {question.isFlagged && (
                      <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      ))}

      <ul className="grid grid-cols-2 gap-1.5 border-t border-border pt-3 text-xs text-slate-600">
        {legend.map((outcome) => (
          <li key={outcome} className="flex items-center gap-2">
            <span className={cn('size-3 rounded border', OUTCOME_META[outcome].cell)} />
            {OUTCOME_META[outcome].label}
          </li>
        ))}
        <li className="col-span-2 flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-500" /> Đã đánh dấu
        </li>
      </ul>
    </div>
  );
}
