import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock } from 'lucide-react';
import { AppDialog } from '@/components/AppDialog';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { ToggleSwitch } from '@/features/question-bank/components/FilterControls';
import { inputClass, textareaClass } from '@/features/question-bank/form/styles';
import { cn } from '@/lib/utils';
import { EXAM_TYPE_META, SCALES } from '../exam-meta';
import type { ExamFormValues, ScoringScale } from '../types';

// Luật khớp CreateExamDto ở backend; ô số giữ dạng chuỗi để ô trống không thành NaN
const schema = z
  .object({
    title: z.string(),
    description: z.string(),
    scoringScale: z.enum(['TOEIC_990', 'TOEIC_SW', 'PERCENT']),
    durationMinutes: z.string(),
    maxAttempts: z.string(),
    allowPartPractice: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (!values.title.trim()) issue('title', 'Nhập tên đề');
    else if (values.title.trim().length > 255) issue('title', 'Tên đề tối đa 255 ký tự');
    if (values.description.length > 2000) issue('description', 'Mô tả tối đa 2000 ký tự');
    const minutes = Number(values.durationMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 300) {
      issue('durationMinutes', 'Thời gian từ 1 đến 300 phút');
    }
    if (values.maxAttempts.trim()) {
      const attempts = Number(values.maxAttempts);
      if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100) {
        issue('maxAttempts', 'Số lần làm từ 1 đến 100, để trống nếu không giới hạn');
      }
    }
  });

type FormValues = z.infer<typeof schema>;

interface ExamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có khi sửa thông tin đề đã có */
  initial?: ExamFormValues;
  /** Đề đã có phần thi thì không đổi được loại đề (backend chặn đổi thang điểm) */
  lockScale?: boolean;
  onSubmit: (values: ExamFormValues) => void | Promise<void>;
}

function toFormValues(initial?: ExamFormValues): FormValues {
  return {
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    scoringScale: initial?.scoringScale ?? 'TOEIC_990',
    durationMinutes: String(initial?.durationMinutes ?? EXAM_TYPE_META.TOEIC_990.defaultMinutes),
    maxAttempts: initial?.maxAttempts ? String(initial.maxAttempts) : '',
    allowPartPractice: initial?.allowPartPractice ?? true,
  };
}

// Mỗi lần mở hộp thoại tạo mới form (key ở nơi gọi) để không giữ dữ liệu lần trước
export function ExamFormDialog({
  open,
  onOpenChange,
  initial,
  lockScale = false,
  onSubmit,
}: ExamFormDialogProps) {
  const editing = !!initial;
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(initial) });
  const [scale, allowPartPractice] = useWatch({
    control,
    name: ['scoringScale', 'allowPartPractice'],
  });

  const chooseScale = (next: ScoringScale) => {
    setValue('scoringScale', next, { shouldDirty: true });
    // Chưa tự sửa thời gian thì điền thời gian gợi ý của loại đề
    if (!dirtyFields.durationMinutes) {
      setValue('durationMinutes', String(EXAM_TYPE_META[next].defaultMinutes));
    }
  };

  const submit = (values: FormValues) =>
    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      scoringScale: values.scoringScale,
      durationMinutes: Number(values.durationMinutes),
      maxAttempts: values.maxAttempts.trim() ? Number(values.maxAttempts) : null,
      allowPartPractice: values.allowPartPractice,
    });

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      busy={isSubmitting}
      title={editing ? 'Sửa thông tin đề' : 'Tạo đề thi'}
      description={
        editing
          ? 'Đổi tên, thời gian và cấu hình làm bài. Nội dung đề sửa ở màn soạn đề.'
          : 'Chọn loại đề, sau đó thêm các Part và câu hỏi ở màn soạn đề.'
      }
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <SubmitButton
            form="exam-form"
            loading={isSubmitting}
            className="h-10 w-auto px-5 text-sm"
          >
            {editing ? 'Lưu thông tin' : 'Tạo và soạn đề'}
          </SubmitButton>
        </>
      }
    >
      <form id="exam-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
        <FormField id="exam-title" label="Tên đề" required error={errors.title?.message}>
          <input
            id="exam-title"
            placeholder="Ví dụ: TOEIC LR – Đề số 2"
            aria-invalid={!!errors.title}
            className={inputClass}
            {...register('title')}
          />
        </FormField>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">
            Loại đề <span className="text-rose-500">*</span>
          </p>
          <div role="radiogroup" aria-label="Loại đề" className="grid gap-3 sm:grid-cols-3">
            {SCALES.map((item) => {
              const meta = EXAM_TYPE_META[item];
              const Icon = meta.icon;
              const active = scale === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={lockScale && !active}
                  onClick={() => chooseScale(item)}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-col sm:gap-2',
                    active
                      ? 'border-primary bg-accent ring-1 ring-primary'
                      : 'border-border hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-xl',
                      active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {meta.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-subtle">{meta.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {lockScale && (
            <p className="flex items-center gap-1.5 text-xs text-subtle">
              <Lock className="size-3.5" />
              Đề đã có phần thi nên không đổi được loại đề.
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="exam-duration"
            label="Thời gian làm bài (phút)"
            required
            error={errors.durationMinutes?.message}
          >
            <input
              id="exam-duration"
              type="number"
              inputMode="numeric"
              min={1}
              max={300}
              aria-invalid={!!errors.durationMinutes}
              className={inputClass}
              {...register('durationMinutes')}
            />
          </FormField>
          <FormField
            id="exam-attempts"
            label="Số lần làm tối đa"
            error={errors.maxAttempts?.message}
          >
            <input
              id="exam-attempts"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              placeholder="Không giới hạn"
              aria-invalid={!!errors.maxAttempts}
              className={inputClass}
              {...register('maxAttempts')}
            />
          </FormField>
        </div>

        <ToggleSwitch
          label="Cho học viên luyện riêng từng Part"
          checked={allowPartPractice}
          onChange={(checked) => setValue('allowPartPractice', checked, { shouldDirty: true })}
        />

        <FormField id="exam-description" label="Mô tả" error={errors.description?.message}>
          <textarea
            id="exam-description"
            rows={3}
            placeholder="Ghi chú ngắn cho học viên: nội dung, mục tiêu của đề (không bắt buộc)"
            className={textareaClass}
            {...register('description')}
          />
        </FormField>
      </form>
    </AppDialog>
  );
}
