import { FileText } from 'lucide-react';
import type { PaperBlock, Skill } from '@/api/generated';
import { QuestionMedia } from '@/components/QuestionMedia';
import { PassageView } from '@/features/question-bank/components/GroupContent';
import { cn } from '@/lib/utils';
import { QuestionCard } from './QuestionCard';
import type { AnswerPatch, LocalAnswer } from './use-answer-sync';

interface BlockViewProps {
  block: PaperBlock;
  skill: Skill;
  part: number;
  answers: Record<string, LocalAnswer>;
  activeId?: string;
  onChange: (examQuestionId: string, patch: AnswerPatch, typing?: boolean) => void;
}

/**
 * Câu đơn: hiện thẳng câu hỏi. Nhóm câu (đoạn văn, hội thoại, bảng thông tin): nội dung dùng chung
 * bên trái (dính khi cuộn), các câu bên phải; màn hẹp thì xếp chồng
 */
export function BlockView({ block, skill, part, answers, activeId, onChange }: BlockViewProps) {
  const cards = block.questions.map((question) => (
    <QuestionCard
      key={question.examQuestionId}
      question={question}
      skill={skill}
      part={part}
      answer={answers[question.examQuestionId]}
      active={activeId === question.examQuestionId}
      onChange={(patch, typing) => onChange(question.examQuestionId, patch, typing)}
    />
  ));

  const group = block.group;
  if (!group) return <div className="space-y-4">{cards}</div>;

  const first = block.questions[0]?.number;
  const last = block.questions.at(-1)?.number;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section
        aria-label="Nội dung dùng chung"
        className={cn(
          'space-y-4 rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6',
          'lg:sticky lg:top-36 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto',
        )}
      >
        <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-brand">
          <FileText className="size-4" />
          {first === last ? `Câu ${first}` : `Câu ${first}–${last}`} dùng chung nội dung sau
        </p>
        {group.audioUrl && <QuestionMedia kind="audio" url={group.audioUrl} label="Âm thanh" />}
        {group.imageUrl && <QuestionMedia kind="image" url={group.imageUrl} />}
        {group.passage && (
          <div className="rounded-2xl bg-slate-50 p-4 sm:p-5">
            <PassageView text={group.passage} />
          </div>
        )}
        {skill === 'LISTENING' && !group.passage && (
          <p className="text-xs text-subtle">
            Nghe đoạn hội thoại/bài nói rồi trả lời các câu bên cạnh. Lời thoại chỉ hiện ở màn xem
            lại.
          </p>
        )}
      </section>
      <div className="space-y-4">{cards}</div>
    </div>
  );
}
