import { FileText, MessagesSquare } from 'lucide-react';
import type { ReviewBlock, ReviewQuestion } from '@/api/generated';
import { QuestionMedia } from '@/components/QuestionMedia';
import { PassageView, TranscriptView } from '@/features/question-bank/components/GroupContent';
import { cn } from '@/lib/utils';
import { ReviewQuestionCard } from './ReviewQuestionCard';

interface ReviewBlockViewProps {
  block: ReviewBlock;
  /** Câu còn hiện sau khi lọc (nhóm vẫn giữ nội dung dùng chung) */
  questions: ReviewQuestion[];
}

/**
 * Giống bố cục lúc làm bài: nhóm câu có nội dung dùng chung bên trái (dính khi cuộn), các câu bên
 * phải. Màn xem lại có thêm lời thoại Listening (lúc làm bài bị ẩn).
 */
export function ReviewBlockView({ block, questions }: ReviewBlockViewProps) {
  const cards = questions.map((question) => (
    <ReviewQuestionCard key={question.examQuestionId} question={question} />
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
          'lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto',
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
        {group.transcript && (
          <details open className="group rounded-2xl bg-slate-50 p-4 sm:p-5">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800 select-none [&::-webkit-details-marker]:hidden">
              <MessagesSquare className="size-4 text-primary" />
              Lời thoại (transcript)
              <span className="ml-auto text-xs font-medium text-primary group-open:hidden">
                Xem
              </span>
              <span className="ml-auto hidden text-xs font-medium text-primary group-open:inline">
                Thu gọn
              </span>
            </summary>
            <TranscriptView text={group.transcript} className="mt-3" />
          </details>
        )}
      </section>
      <div className="space-y-4">{cards}</div>
    </div>
  );
}
