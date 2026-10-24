import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CircleCheck, Info } from 'lucide-react';
import { FieldError } from '@/components/form/FieldError';
import { FormField } from '@/components/form/FormField';
import { cn } from '@/lib/utils';
import { defaultContent, isDefaultContent, OPTION_LABELS, type PartRule } from '../toeic';
import { LockedArea } from './LockedArea';
import { CONTENT_MAX, SAMPLE_ANSWER_MAX, type QuestionFormValues } from './question-form';
import { inputClass, textareaClass } from './styles';

/** Gợi ý nội dung câu hỏi theo dạng Part */
function contentPlaceholder(rule?: PartRule): string {
  if (!rule) return 'Chọn kỹ năng và Part trước để biết cần nhập gì…';
  if (rule.skill === 'LISTENING' && rule.part <= 2)
    return 'Ví dụ: Look at the picture and choose the statement that best describes it.';
  if (rule.skill === 'READING' && rule.part === 5)
    return 'Ví dụ: The manager asked ___ to finish the report by Friday.';
  if (rule.skill === 'SPEAKING' && rule.part === 1) return 'Đoạn văn học viên đọc to…';
  if (rule.type === 'WRITTEN_RESPONSE') return 'Đề bài học viên cần viết…';
  return 'Nội dung câu hỏi…';
}

// Khối 2: nội dung câu hỏi + phần trả lời (phương án trắc nghiệm hoặc câu trả lời mẫu).
// locked: câu đang được làm bài, khóa nội dung, phương án, thời gian (câu trả lời mẫu vẫn sửa được)
export function AnswerFields({ rule, locked = false }: { rule?: PartRule; locked?: boolean }) {
  const {
    register,
    getValues,
    setValue,
    formState: { errors, isSubmitted },
  } = useFormContext<QuestionFormValues>();
  const [content, correct, sampleAnswer, skill, part, orderInGroup] = useWatch<
    QuestionFormValues,
    ['content', 'correct', 'sampleAnswer', 'skill', 'part', 'orderInGroup']
  >({ name: ['content', 'correct', 'sampleAnswer', 'skill', 'part', 'orderInGroup'] });
  const hasDefault = defaultContent(skill, part) !== undefined;

  // L1, L2, R6: điền nhãn mặc định khi đổi Part hoặc thứ tự trong nhóm (R6 "Chỗ trống [n]").
  // Chỉ thay khi ô đang trống hoặc vẫn là nhãn mặc định: giáo viên đã tự sửa thì giữ nguyên.
  // Không theo dõi content: giáo viên xóa trắng ô để tự gõ thì không bị điền lại ngay.
  useEffect(() => {
    const current = getValues('content');
    if (current.trim() && !isDefaultContent(current)) return;
    const next = defaultContent(skill, part, orderInGroup) ?? '';
    if (next !== current) {
      setValue('content', next, { shouldDirty: true, shouldValidate: isSubmitted });
    }
  }, [skill, part, orderInGroup, getValues, setValue, isSubmitted]);

  return (
    <div className="space-y-6">
      <LockedArea locked={locked} className="space-y-6">
        <FormField
          id="content"
          label={
            rule?.skill === 'SPEAKING' && rule.part === 1 ? 'Đoạn văn cần đọc' : 'Nội dung câu hỏi'
          }
          required
          error={errors.content?.message}
          hint={<Counter value={content.length} max={CONTENT_MAX} />}
        >
          <textarea
            id="content"
            rows={4}
            placeholder={contentPlaceholder(rule)}
            aria-invalid={!!errors.content}
            className={textareaClass}
            {...register('content')}
          />
          {hasDefault && (
            <p className="flex items-start gap-1.5 px-1 text-xs text-subtle">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Đề thật không in câu hỏi cho Part này; nội dung được điền sẵn làm nhãn để phân biệt
                các câu, bạn sửa được.
                {skill === 'READING' &&
                  ' Số trong [ ] tự đổi theo Thứ tự trong nhóm, khớp dấu [n] ___ trong đoạn văn của nhóm.'}
              </span>
            </p>
          )}
        </FormField>

        {rule?.type === 'SINGLE_CHOICE' && (
          <fieldset className="space-y-3">
            <legend className="mb-2 flex w-full items-center justify-between gap-2 text-xs font-semibold text-slate-700">
              <span>
                Phương án <span className="text-rose-500">*</span>
              </span>
              <span className="font-normal text-subtle">
                Chọn ô tròn bên trái để đặt đáp án đúng
              </span>
            </legend>
            {OPTION_LABELS.slice(0, rule.optionCount).map((label, index) => {
              const isCorrect = correct === label;
              const error = errors.options?.[index]?.content?.message;
              return (
                <div key={label}>
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-2 pr-3 transition-colors',
                      isCorrect ? 'border-success/50 bg-success-soft/60' : 'border-border',
                      error && 'border-destructive',
                    )}
                  >
                    <label
                      className="flex shrink-0 cursor-pointer items-center gap-2"
                      title={`Đặt ${label} là đáp án đúng`}
                    >
                      <input
                        type="radio"
                        value={label}
                        className="size-4 accent-success"
                        aria-label={`Đáp án đúng là ${label}`}
                        {...register('correct')}
                      />
                      <span
                        className={cn(
                          'flex size-8 items-center justify-center rounded-lg text-sm font-bold',
                          isCorrect ? 'bg-success text-white' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {label}
                      </span>
                    </label>
                    <input
                      id={`option-${label}`}
                      placeholder={`Nội dung phương án ${label}`}
                      aria-label={`Nội dung phương án ${label}`}
                      aria-invalid={!!error}
                      className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle disabled:cursor-not-allowed"
                      {...register(`options.${index}.content`)}
                    />
                    {isCorrect && (
                      <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-success sm:inline-flex">
                        <CircleCheck className="size-4" />
                        Đáp án đúng
                      </span>
                    )}
                  </div>
                  <FieldError message={error} />
                </div>
              );
            })}
            <FieldError message={errors.correct?.message ?? errors.options?.message} />
          </fieldset>
        )}
      </LockedArea>

      {rule && rule.type !== 'SINGLE_CHOICE' && (
        <>
          <FormField
            id="sampleAnswer"
            label="Câu trả lời mẫu"
            required
            error={errors.sampleAnswer?.message}
            hint={<Counter value={sampleAnswer.length} max={SAMPLE_ANSWER_MAX} />}
          >
            <textarea
              id="sampleAnswer"
              rows={4}
              placeholder="Câu trả lời đạt điểm cao; học viên xem khi xem lại bài, AI dùng làm mốc khi chấm"
              aria-invalid={!!errors.sampleAnswer}
              className={textareaClass}
              {...register('sampleAnswer')}
            />
          </FormField>

          {rule.skill === 'SPEAKING' && (
            <LockedArea locked={locked} className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="prepSeconds"
                label="Thời gian chuẩn bị (giây)"
                required
                error={errors.prepSeconds?.message}
              >
                <input
                  id="prepSeconds"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={300}
                  aria-invalid={!!errors.prepSeconds}
                  className={inputClass}
                  {...register('prepSeconds')}
                />
              </FormField>
              <FormField
                id="responseSeconds"
                label="Thời gian trả lời (giây)"
                required
                error={errors.responseSeconds?.message}
              >
                <input
                  id="responseSeconds"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={3600}
                  aria-invalid={!!errors.responseSeconds}
                  className={inputClass}
                  {...register('responseSeconds')}
                />
              </FormField>
              <p className="text-xs text-subtle sm:col-span-2">
                Đã điền sẵn theo chuẩn TOEIC của Part {rule.part} ({rule.defaultSeconds?.prep}s
                chuẩn bị, {rule.defaultSeconds?.response}s trả lời).
              </p>
            </LockedArea>
          )}
          {rule.skill === 'WRITING' && (
            <p className="text-xs text-subtle">
              Writing tính giờ theo cả phần thi khi tạo đề, không đặt thời gian cho từng câu.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        value > max ? 'font-semibold text-destructive' : 'text-subtle',
      )}
    >
      {value}/{max}
    </span>
  );
}
