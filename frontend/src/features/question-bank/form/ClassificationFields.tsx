import { useFormContext, useWatch } from 'react-hook-form';
import { Info, Layers, Square } from 'lucide-react';
import type { Skill } from '@/api/generated';
import { FieldError } from '@/components/form/FieldError';
import { FormField } from '@/components/form/FormField';
import { NativeSelect } from '@/components/form/NativeSelect';
import { cn } from '@/lib/utils';
import { useToeicTopics } from '../hooks/use-toeic-topics';
import {
  DIFFICULTY_META,
  findPartRule,
  partsOfSkill,
  SKILL_META,
  SKILLS,
  type PartRule,
} from '../toeic';
import { LockedArea } from './LockedArea';
import type { QuestionFormValues } from './question-form';

/** Mô tả ngắn dạng câu của Part, hiện trên thẻ chọn Part */
function partHint(rule: PartRule): string {
  if (rule.type === 'SINGLE_CHOICE') return `${rule.optionCount} phương án`;
  return rule.type === 'SPOKEN_RESPONSE' ? 'Trả lời nói' : 'Trả lời viết';
}

// Khối 1: kỹ năng → Part → chủ đề → độ khó. Đổi kỹ năng/Part thì xóa các lựa chọn phụ thuộc.
// locked: câu đang được làm bài, không đổi được kỹ năng, Part (chủ đề, độ khó vẫn sửa được)
export function ClassificationFields({ locked = false }: { locked?: boolean }) {
  const {
    register,
    setValue,
    getValues,
    formState: { errors, isSubmitted },
  } = useFormContext<QuestionFormValues>();
  const [skill, part, topicId] = useWatch<QuestionFormValues, ['skill', 'part', 'topicId']>({
    name: ['skill', 'part', 'topicId'],
  });
  const rule = skill ? findPartRule(skill, part) : undefined;
  const { topics, isLoading: topicsLoading } = useToeicTopics(
    skill || undefined,
    rule ? part : undefined,
  );
  const opts = { shouldDirty: true, shouldValidate: isSubmitted };

  const selectPart = (nextSkill: Skill, nextPart: number) => {
    const nextRule = findPartRule(nextSkill, nextPart);
    setValue('part', nextPart, opts);
    // Chủ đề, nhóm gắn với từng Part: lựa chọn cũ không còn hợp lệ
    setValue('topicId', '', opts);
    setValue('groupId', '', opts);
    setValue('orderInGroup', '', opts);
    // Speaking: điền sẵn thời gian chuẩn của Part, giáo viên sửa được
    setValue(
      'prepSeconds',
      nextRule?.defaultSeconds ? String(nextRule.defaultSeconds.prep) : '',
      opts,
    );
    setValue(
      'responseSeconds',
      nextRule?.defaultSeconds ? String(nextRule.defaultSeconds.response) : '',
      opts,
    );
    // Part 2 Listening chỉ có A–C
    const count = nextRule?.optionCount ?? 0;
    if (getValues('correct') && 'ABCD'.indexOf(getValues('correct')) >= count) {
      setValue('correct', '', opts);
    }
  };

  const selectSkill = (nextSkill: Skill) => {
    if (nextSkill === skill) return;
    setValue('skill', nextSkill, opts);
    selectPart(nextSkill, 0);
  };

  return (
    <div className="space-y-6">
      <LockedArea locked={locked} className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">
            Kỹ năng <span className="text-rose-500">*</span>
          </p>
          <div
            role="radiogroup"
            aria-label="Kỹ năng"
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            {SKILLS.map((item) => {
              const meta = SKILL_META[item];
              const Icon = meta.icon;
              const active = skill === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectSkill(item)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:cursor-not-allowed',
                    active
                      ? 'border-primary bg-accent ring-1 ring-primary'
                      : 'border-border hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      meta.tile,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{meta.label}</span>
                    <span className="block text-xs text-subtle">{meta.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <FieldError message={errors.skill?.message} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">
            Part <span className="text-rose-500">*</span>
          </p>
          {skill ? (
            <div
              role="radiogroup"
              aria-label="Part"
              className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
            >
              {partsOfSkill(skill).map((item) => {
                const active = rule?.part === item.part;
                const grouped = item.group === 'required';
                return (
                  <button
                    key={item.part}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => !active && selectPart(skill, item.part)}
                    className={cn(
                      'rounded-xl border px-3.5 py-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:cursor-not-allowed',
                      active
                        ? 'border-primary bg-accent ring-1 ring-primary'
                        : 'border-border hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-sm font-bold',
                          active ? 'text-brand' : 'text-foreground',
                        )}
                      >
                        Part {item.part}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          grouped ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {grouped ? <Layers className="size-3" /> : <Square className="size-3" />}
                        {grouped ? 'Nhóm câu' : 'Đơn lẻ'}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-sm text-slate-700">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-subtle">{partHint(item)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-subtle">
              Chọn kỹ năng để xem các Part.
            </p>
          )}
          <FieldError message={errors.part?.message} />
        </div>
      </LockedArea>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="topicId" label="Chủ đề" required error={errors.topicId?.message}>
          <NativeSelect
            id="topicId"
            disabled={!rule || topicsLoading}
            aria-invalid={!!errors.topicId}
            // Danh sách lựa chọn tải sau: điều khiển giá trị theo state của form, nếu không thẻ select
            // giữ placeholder vì lúc RHF gán giá trị chưa có <option> tương ứng
            {...register('topicId')}
            value={topicId}
          >
            <option value="">
              {!rule ? 'Chọn Part trước' : topicsLoading ? 'Đang tải chủ đề…' : 'Chọn chủ đề'}
            </option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700">
            Độ khó <span className="text-rose-500">*</span>
          </span>
          <div
            role="radiogroup"
            aria-label="Độ khó"
            className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
          >
            {(Object.keys(DIFFICULTY_META) as (keyof typeof DIFFICULTY_META)[]).map((key) => (
              <label key={key} className="cursor-pointer">
                <input
                  type="radio"
                  value={key}
                  className="peer sr-only"
                  {...register('difficulty')}
                />
                <span className="flex h-8 items-center justify-center rounded-lg text-sm font-medium text-slate-600 transition-colors peer-checked:bg-white peer-checked:font-semibold peer-checked:text-brand peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-primary/30 peer-disabled:cursor-not-allowed">
                  {DIFFICULTY_META[key].label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {rule && (
        <p className="flex items-start gap-2 rounded-xl bg-accent/70 px-4 py-3 text-sm text-slate-700">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {rule.type === 'SINGLE_CHOICE'
              ? `Câu trắc nghiệm ${rule.optionCount} phương án (${'ABCD'.slice(0, rule.optionCount)}), đúng một đáp án.`
              : rule.type === 'SPOKEN_RESPONSE'
                ? 'Học viên ghi âm câu trả lời; AI chấm dựa trên câu trả lời mẫu.'
                : 'Học viên viết câu trả lời; AI chấm dựa trên câu trả lời mẫu.'}{' '}
            {rule.group === 'required' &&
              `Câu thuộc một nhóm câu (${rule.groupContent === 'transcript' ? 'dùng chung lời thoại' : 'dùng chung đoạn văn'}).`}
          </span>
        </p>
      )}
    </div>
  );
}
