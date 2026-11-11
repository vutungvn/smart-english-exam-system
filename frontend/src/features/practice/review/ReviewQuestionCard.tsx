import type { ReactNode } from 'react';
import {
  BookmarkCheck,
  Check,
  Lightbulb,
  Mic,
  MicOff,
  NotebookPen,
  Sparkles,
  X,
} from 'lucide-react';
import type { ReviewQuestion } from '@/api/generated';
import { QuestionMedia } from '@/components/QuestionMedia';
import { MediaAudio } from '@/components/media/MediaAudio';
import { cn } from '@/lib/utils';
import { countWords } from '../practice-meta';
import { AiExplanationPanel } from './AiExplanationPanel';
import { AssessmentPanel } from './AssessmentPanel';
import { OUTCOME_META } from './review-meta';

interface ReviewQuestionCardProps {
  attemptId: string;
  question: ReviewQuestion;
}

/**
 * Một câu ở màn xem lại: kết quả, lựa chọn của học viên so với đáp án đúng, giải thích, bài mẫu;
 * câu trắc nghiệm có thêm "Giải thích bằng AI"
 */
export function ReviewQuestionCard({ attemptId, question }: ReviewQuestionCardProps) {
  const meta = OUTCOME_META[question.outcome];
  const choice = question.type === 'SINGLE_CHOICE';

  return (
    <article
      id={`q-${question.examQuestionId}`}
      aria-label={`Câu ${question.number}: ${meta.label}`}
      className="scroll-mt-28 rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
            meta.number,
          )}
        >
          {question.number}
        </span>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', meta.badge)}>
          {meta.label}
          {question.outcome === 'SCORED' &&
            question.assessment &&
            ` · ${question.assessment.score}/${question.assessment.maxScore} điểm`}
        </span>
        {question.isFlagged && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <BookmarkCheck className="size-3.5" />
            Đã đánh dấu
          </span>
        )}
      </div>

      {(question.imageUrl || question.audioUrl) && (
        // Có cả ảnh và audio thì chia 2 cột; chỉ một thứ (L2, S3, S4 chỉ có audio) thì dùng hết chiều rộng
        <div
          className={cn(
            'mt-4 grid gap-3',
            question.imageUrl && question.audioUrl && 'sm:grid-cols-2',
          )}
        >
          {question.imageUrl && <QuestionMedia kind="image" url={question.imageUrl} />}
          {question.audioUrl && <QuestionMedia kind="audio" url={question.audioUrl} />}
        </div>
      )}

      <p className="mt-4 text-base leading-relaxed font-semibold wrap-break-word whitespace-pre-line text-foreground">
        {question.content}
      </p>

      {choice ? (
        <ChoiceReview question={question} />
      ) : (
        <>
          {question.type === 'WRITTEN_RESPONSE' ? (
            <WritingReview question={question} />
          ) : (
            <SpeakingReview question={question} />
          )}
          {question.assessment && (
            <AssessmentPanel
              attemptId={attemptId}
              assessment={question.assessment}
              kind={question.type === 'WRITTEN_RESPONSE' ? 'writing' : 'speaking'}
            />
          )}
        </>
      )}

      {question.sampleAnswer && (
        <Note
          icon={<Sparkles className="size-4" />}
          title="Bài mẫu"
          tone="bg-accent/60 text-slate-800"
        >
          <p className="wrap-break-word whitespace-pre-line">{question.sampleAnswer}</p>
        </Note>
      )}

      {question.explanation && (
        // Câu sai hoặc bỏ trống: mở sẵn giải thích; câu đúng thì gọn lại
        <details
          open={question.outcome !== 'CORRECT'}
          className="group mt-4 rounded-2xl border border-border bg-slate-50 px-4 py-3"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800 select-none [&::-webkit-details-marker]:hidden">
            <Lightbulb className="size-4 text-amber-500" />
            {choice ? 'Giải thích đáp án' : 'Gợi ý cách làm'}
            <span className="ml-auto text-xs font-medium text-primary group-open:hidden">Xem</span>
            <span className="ml-auto hidden text-xs font-medium text-primary group-open:inline">
              Thu gọn
            </span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed wrap-break-word whitespace-pre-line text-slate-700">
            {question.explanation}
          </p>
        </details>
      )}

      {choice && <AiExplanationPanel attemptId={attemptId} question={question} />}
    </article>
  );
}

function ChoiceReview({ question }: { question: ReviewQuestion }) {
  return (
    <div className="mt-4 space-y-2">
      <ul aria-label={`Phương án câu ${question.number}`} className="grid gap-2">
        {question.options.map((option) => {
          const chosen = question.selectedOptionId === option.id;
          const wrongChoice = chosen && !option.isCorrect;
          return (
            <li
              key={option.id}
              className={cn(
                'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
                option.isCorrect
                  ? 'border-emerald-300 bg-emerald-50 text-foreground'
                  : wrongChoice
                    ? 'border-destructive/30 bg-danger-soft text-foreground'
                    : 'border-border bg-white text-slate-700',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  option.isCorrect
                    ? 'bg-emerald-500 text-white'
                    : wrongChoice
                      ? 'bg-destructive text-white'
                      : 'bg-slate-100 text-slate-600',
                )}
              >
                {option.label}
              </span>
              <span className="min-w-0 flex-1 pt-1 wrap-break-word">{option.content}</span>
              <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                {option.isCorrect && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <Check className="size-3.5" />
                    Đáp án đúng
                  </span>
                )}
                {chosen && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-semibold',
                      wrongChoice ? 'text-destructive' : 'text-success',
                    )}
                  >
                    {wrongChoice && <X className="size-3.5" />}
                    Bạn chọn
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {question.outcome === 'SKIPPED' && (
        <p className="text-xs text-subtle">Bạn chưa chọn đáp án cho câu này.</p>
      )}
    </div>
  );
}

function WritingReview({ question }: { question: ReviewQuestion }) {
  const text = question.textAnswer?.trim();
  return (
    <Note
      icon={<NotebookPen className="size-4" />}
      title="Bài làm của bạn"
      tone="bg-white ring-1 ring-border text-slate-800"
      aside={text ? `${countWords(text)} từ` : undefined}
    >
      {text ? (
        <p className="wrap-break-word whitespace-pre-line">{question.textAnswer}</p>
      ) : (
        <p className="text-subtle italic">Bạn chưa viết bài cho câu này.</p>
      )}
      {!text && (
        <p className="mt-2 text-xs text-subtle">
          Câu bỏ trống được tính 0 điểm, không cần AI chấm.
        </p>
      )}
    </Note>
  );
}

function SpeakingReview({ question }: { question: ReviewQuestion }) {
  // Bài nói đã tự xóa khi hết thời hạn lưu (D19): vẫn là câu đã trả lời, điểm và transcript còn giữ
  if (question.recordingDeletedAt) {
    return (
      <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
        <MicOff className="mt-0.5 size-4 shrink-0" />
        <span>
          Bản ghi âm đã tự xóa ngày{' '}
          {new Date(question.recordingDeletedAt).toLocaleDateString('vi-VN')} do hết thời hạn lưu
          giọng nói (bảo vệ dữ liệu cá nhân). Điểm, nhận xét và nội dung AI nghe được vẫn giữ
          nguyên.
        </span>
      </p>
    );
  }
  if (!question.recordingUrl) {
    return (
      <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Mic className="mt-0.5 size-4 shrink-0" />
        <span>
          Câu này chưa có bài nói nên được tính 0 điểm, không cần AI chấm.
          {question.responseSeconds !== null &&
            ` Thi thật: chuẩn bị ${question.prepSeconds ?? 0} giây, trả lời ${question.responseSeconds} giây.`}
        </span>
      </p>
    );
  }
  return (
    <section className="mt-4 space-y-3 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
      <h3 className="flex items-center gap-2 font-semibold">
        <Mic className="size-4" />
        Bài nói của bạn
      </h3>
      <MediaAudio url={question.recordingUrl} />
      {/* Bài nộp trước khi có chấm Speaking (chưa có phiếu chấm) */}
      {question.outcome === 'PENDING' && !question.assessment && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          Bài nói đang chờ AI chấm theo tiêu chí; điểm sẽ hiện ở đây khi chấm xong.
        </p>
      )}
    </section>
  );
}

function Note({
  icon,
  title,
  tone,
  aside,
  children,
}: {
  icon: ReactNode;
  title: string;
  tone: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('mt-4 rounded-2xl px-4 py-3 text-sm leading-relaxed', tone)}>
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        {icon}
        {title}
        {aside && (
          <span className="ml-auto text-xs font-medium text-subtle tabular-nums">{aside}</span>
        )}
      </h3>
      {children}
    </section>
  );
}
