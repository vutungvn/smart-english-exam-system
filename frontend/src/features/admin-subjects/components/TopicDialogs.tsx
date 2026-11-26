import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Trash2, TriangleAlert } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useCreateTopicMutation,
  useDeleteTopicMutation,
  useUpdateTopicMutation,
  type AdminTopicItem,
  type Skill,
} from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { inputClass, textareaClass } from '@/features/question-bank/form/styles';
import { partsOfSkill, SKILL_META, SKILLS } from '@/features/question-bank/toeic';
import { applyFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { formatCount } from '../labels';
import { ConfirmDialog } from './ConfirmDialog';

const topicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Tên dài từ 2 đến 150 ký tự')
      .max(150, 'Tên dài từ 2 đến 150 ký tự'),
    skill: z.enum(['LISTENING', 'READING', 'SPEAKING', 'WRITING']),
    parts: z.array(z.number()),
    description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự'),
  })
  .superRefine((values, ctx) => {
    const allowed = partsOfSkill(values.skill).map((rule) => rule.part);
    const parts = values.parts.filter((part) => allowed.includes(part));
    if (parts.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['parts'], message: 'Chọn ít nhất 1 Part' });
    }
  });

type TopicValues = z.infer<typeof topicSchema>;
const SERVER_FIELDS = ['name', 'skill', 'parts', 'description'] as const;

const toValues = (topic: AdminTopicItem | null): TopicValues => ({
  name: topic?.name ?? '',
  skill: topic?.skill ?? 'LISTENING',
  parts: topic?.parts ?? [],
  description: topic?.description ?? '',
});

interface TopicFormDialogProps {
  subjectId: string;
  /** undefined: đóng; null: thêm mới; có giá trị: sửa */
  topic: AdminTopicItem | null | undefined;
  /** Kỹ năng chọn sẵn khi thêm (đang lọc theo kỹ năng nào thì lấy kỹ năng đó) */
  defaultSkill?: Skill;
  onClose: () => void;
  onDone: (message: string) => void;
}

export function TopicFormDialog({
  subjectId,
  topic,
  defaultSkill,
  onClose,
  onDone,
}: TopicFormDialogProps) {
  const [busy, setBusy] = useState(false);

  return (
    <AppDialog
      open={topic !== undefined}
      onOpenChange={(open) => !open && onClose()}
      busy={busy}
      size="lg"
      title={topic ? 'Sửa chủ đề' : 'Thêm chủ đề'}
      description="Chủ đề phân loại câu hỏi và là đơn vị thống kê điểm mạnh, điểm yếu của học viên."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </Button>
          <SubmitButton form="topic-form" loading={busy} className="h-10 w-auto px-5 text-sm">
            {!busy && <Save />}
            {topic ? 'Lưu thay đổi' : 'Thêm chủ đề'}
          </SubmitButton>
        </>
      }
    >
      {topic !== undefined && (
        // key: mở cho chủ đề khác thì tạo form mới
        <TopicForm
          key={topic?.id ?? 'new'}
          subjectId={subjectId}
          topic={topic}
          defaultSkill={defaultSkill}
          onBusy={setBusy}
          onDone={onDone}
        />
      )}
    </AppDialog>
  );
}

function TopicForm({
  subjectId,
  topic,
  defaultSkill,
  onBusy,
  onDone,
}: {
  subjectId: string;
  topic: AdminTopicItem | null;
  defaultSkill?: Skill;
  onBusy: (busy: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [createTopic] = useCreateTopicMutation();
  const [updateTopic] = useUpdateTopicMutation();
  const [conflict, setConflict] = useState(false);
  const inUse = topic ? topic.questionCount + topic.groupCount : 0;
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<TopicValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: { ...toValues(topic), ...(!topic && defaultSkill && { skill: defaultSkill }) },
  });
  const [skill, name] = useWatch({ control, name: ['skill', 'name'] });
  const partRules = partsOfSkill(skill);
  const renamed = Boolean(topic && name.trim() !== topic.name);

  const submit = async (values: TopicValues) => {
    onBusy(true);
    setConflict(false);
    const allowed = partRules.map((rule) => rule.part);
    const body = {
      name: values.name,
      skill: values.skill,
      parts: values.parts.filter((part) => allowed.includes(part)),
      description: values.description || null,
    };
    try {
      if (topic) {
        await updateTopic({
          id: subjectId,
          topicId: topic.id,
          updateTopicDto: { ...body, updatedAt: topic.updatedAt },
        }).unwrap();
        onDone(`Đã lưu chủ đề "${body.name}"`);
      } else {
        await createTopic({ id: subjectId, createTopicDto: body }).unwrap();
        onDone(`Đã thêm chủ đề "${body.name}"`);
      }
    } catch (cause) {
      const apiError = toApiError(cause);
      if (apiError.code === 'VERSION_CONFLICT') setConflict(true);
      else if (apiError.code === 'TOPIC_NAME_EXISTS') {
        setError('name', { message: apiError.message }, { shouldFocus: true });
      } else if (apiError.code === 'TOPIC_IN_USE') {
        setError('parts', { message: apiError.message });
      } else if (!applyFieldErrors(apiError, setError, SERVER_FIELDS)) {
        setError('root.server', { message: apiError.message });
      }
    } finally {
      onBusy(false);
    }
  };

  return (
    <form id="topic-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
      {conflict && (
        <FormAlert message="Chủ đề vừa được sửa ở nơi khác. Đóng hộp thoại rồi mở lại để sửa trên bản mới nhất." />
      )}
      {errors.root?.server && <FormAlert message={errors.root.server.message ?? ''} />}
      {topic && inUse > 0 && (
        <p className="rounded-2xl bg-accent px-4 py-3 text-sm text-slate-700">
          Chủ đề đang có <strong>{formatCount(topic.questionCount)}</strong> câu hỏi,{' '}
          <strong>{formatCount(topic.groupCount)}</strong> nhóm câu: không đổi được kỹ năng, không
          bỏ được Part còn câu hỏi dùng.
        </p>
      )}

      <FormField id="topic-name" label="Tên chủ đề" required error={errors.name?.message}>
        <input
          id="topic-name"
          autoComplete="off"
          placeholder="Ví dụ: P5/P6 – Câu điều kiện"
          aria-invalid={!!errors.name}
          className={inputClass}
          {...register('name')}
        />
      </FormField>
      {renamed && (
        <p className="-mt-3 flex items-start gap-2 text-xs text-amber-700">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          Tệp nhập câu hỏi ghi chủ đề bằng tên: các tệp đã soạn theo tên cũ sẽ báo lỗi khi nhập.
        </p>
      )}

      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-slate-700">
          Kỹ năng <span className="text-rose-500">*</span>
        </span>
        <div
          role="radiogroup"
          aria-label="Kỹ năng"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {SKILLS.map((value) => {
            const meta = SKILL_META[value];
            const Icon = meta.icon;
            const locked = inUse > 0 && value !== topic?.skill;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={skill === value}
                disabled={locked}
                title={locked ? 'Chủ đề đang có câu hỏi, không đổi được kỹ năng' : undefined}
                onClick={() => {
                  setValue('skill', value, { shouldDirty: true });
                  // Part của kỹ năng cũ không dùng được cho kỹ năng mới
                  setValue('parts', [], { shouldValidate: Boolean(errors.parts) });
                }}
                className={cn(
                  'flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  skill === value
                    ? 'border-primary bg-accent text-brand'
                    : 'border-border bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                <Icon className="size-4" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <Controller
        control={control}
        name="parts"
        render={({ field }) => (
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-slate-700">
              Part dùng được <span className="text-rose-500">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {partRules.map((rule) => {
                const checked = field.value.includes(rule.part);
                return (
                  <label
                    key={rule.part}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                      checked
                        ? 'border-primary bg-accent text-foreground'
                        : 'border-border hover:border-slate-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...field.value, rule.part].sort((a, b) => a - b)
                            : field.value.filter((part) => part !== rule.part),
                        )
                      }
                      className="size-4 accent-primary"
                    />
                    <span>
                      <span className="font-semibold">Part {rule.part}</span>
                      <span className="text-muted-foreground"> · {rule.name}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.parts && (
              <p role="alert" className="px-1 text-xs font-medium text-destructive">
                {errors.parts.message}
              </p>
            )}
          </fieldset>
        )}
      />

      <FormField id="topic-description" label="Mô tả" error={errors.description?.message}>
        <textarea
          id="topic-description"
          placeholder="Không bắt buộc: dạng câu, kiến thức chủ đề này bao quát"
          aria-invalid={!!errors.description}
          className={cn(textareaClass, 'min-h-20')}
          {...register('description')}
        />
      </FormField>
    </form>
  );
}

// ---------------------------------------------------------------------------------------------
// Xóa

export function DeleteTopicDialog({
  subjectId,
  topic,
  onClose,
  onDone,
}: {
  subjectId: string;
  topic: AdminTopicItem | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [deleteTopic, { isLoading }] = useDeleteTopicMutation();
  const [error, setError] = useState<string>();
  const inUse = topic ? topic.questionCount + topic.groupCount > 0 : false;

  const close = () => {
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    if (!topic) return;
    setError(undefined);
    try {
      await deleteTopic({ id: subjectId, topicId: topic.id }).unwrap();
      onDone(`Đã xóa chủ đề "${topic.name}"`);
    } catch (cause) {
      setError(toApiError(cause).message);
    }
  };

  return (
    <ConfirmDialog
      open={topic !== null}
      title={inUse ? 'Không xóa được chủ đề' : 'Xóa chủ đề?'}
      description={topic?.name ?? ''}
      confirmLabel="Xóa chủ đề"
      icon={<Trash2 />}
      tone="danger"
      busy={isLoading}
      error={error}
      canConfirm={!inUse}
      onClose={close}
      onConfirm={() => void confirm()}
    >
      {inUse && topic ? (
        <p>
          Chủ đề đang có {formatCount(topic.questionCount)} câu hỏi, {formatCount(topic.groupCount)}{' '}
          nhóm câu. Chuyển các câu sang chủ đề khác trước khi xóa.
        </p>
      ) : (
        <p>
          Không khôi phục lại được. Nếu chủ đề còn câu hỏi đã xóa trong ngân hàng, hệ thống vẫn chặn
          xóa.
        </p>
      )}
    </ConfirmDialog>
  );
}
