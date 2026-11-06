import { Bookmark, BookmarkCheck, Mic } from 'lucide-react';
import type { PaperQuestion, Skill } from '@/api/generated';
import { QuestionMedia } from '@/components/QuestionMedia';
import { cn } from '@/lib/utils';
import { countWords } from '../practice-meta';
import type { AnswerPatch, LocalAnswer } from './use-answer-sync';

interface QuestionCardProps {
  question: PaperQuestion;
  skill: Skill;
  part: number;
  answer: LocalAnswer | undefined;
  onChange: (patch: AnswerPatch, typing?: boolean) => void;
  /** Câu đang được chọn ở bảng câu hỏi */
  active: boolean;
}

/** Một câu trong đề: trắc nghiệm hoặc bài viết (Writing); Speaking làm ở SpeakingSection */
export function QuestionCard({
  question,
  skill,
  part,
  answer,
  onChange,
  active,
}: QuestionCardProps) {
  const flagged = answer?.isFlagged ?? false;
  // Listening Part 1, 2: đề thật chỉ đọc phương án qua audio, không in chữ
  const hideOptionText = skill === 'LISTENING' && part <= 2;

  return (
    <article
      id={`q-${question.examQuestionId}`}
      aria-label={`Câu ${question.number}`}
      className={cn(
        'scroll-mt-40 rounded-3xl border bg-white p-5 shadow-2xs transition-shadow sm:p-6',
        active ? 'border-primary/40 ring-2 ring-primary/15' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white tabular-nums">
          {question.number}
        </span>
        <button
          type="button"
          aria-pressed={flagged}
          onClick={() => onChange({ isFlagged: !flagged })}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
            flagged
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'text-slate-500 hover:bg-accent hover:text-foreground',
          )}
        >
          {flagged ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          {flagged ? 'Đã đánh dấu' : 'Đánh dấu'}
        </button>
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

      {question.type === 'WRITTEN_RESPONSE' ? (
        <WritingAnswer
          value={answer?.textAnswer ?? ''}
          onChange={(text) => onChange({ textAnswer: text }, true)}
        />
      ) : question.type === 'SPOKEN_RESPONSE' ? (
        <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <Mic className="mt-0.5 size-4 shrink-0" />
          Câu Speaking làm ở phần ghi âm của Part Speaking.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label={`Phương án câu ${question.number}`}
          className={cn('mt-4 gap-2', hideOptionText ? 'flex flex-wrap' : 'grid')}
        >
          {question.options.map((option) => {
            const selected = answer?.selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={hideOptionText ? `Phương án ${option.label}` : undefined}
                // Bấm lại phương án đang chọn thì bỏ chọn
                onClick={() => onChange({ selectedOptionId: selected ? null : option.id })}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border text-left text-sm transition-colors',
                  hideOptionText ? 'size-14 justify-center p-0' : 'px-4 py-3',
                  selected
                    ? 'border-primary bg-accent text-brand'
                    : 'border-border bg-white text-foreground hover:border-primary/40 hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {option.label}
                </span>
                {!hideOptionText && (
                  <span className="min-w-0 flex-1 wrap-break-word">{option.content}</span>
                )}
              </button>
            );
          })}
          {hideOptionText && (
            <p className="w-full text-xs text-subtle">
              Nghe audio và chọn phương án (đề không in chữ).
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function WritingAnswer({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const words = countWords(value);
  return (
    <div className="mt-4">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        rows={10}
        maxLength={10000}
        placeholder="Viết câu trả lời của bạn…"
        aria-label="Câu trả lời"
        className="w-full resize-y rounded-2xl border border-border bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
      />
      <p className="mt-1.5 flex justify-between text-xs text-subtle">
        <span>Tự lưu khi ngừng gõ · không có kiểm tra chính tả như thi thật</span>
        <span className="font-semibold text-slate-600 tabular-nums">{words} từ</span>
      </p>
    </div>
  );
}
