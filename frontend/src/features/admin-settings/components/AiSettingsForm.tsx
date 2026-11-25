import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateAiSettingsMutation, type AdminSettings } from '@/api/generated';
import { FormField } from '@/components/form/FormField';
import { inputClass } from '@/features/question-bank/form/styles';
import { useSettingsForm } from '../hooks/use-settings-form';
import { rangeHint } from '../labels';
import { aiSchema, toAiForm, type AiForm } from '../schemas';
import { SettingsCard } from './SettingsCard';

interface SettingsFormProps {
  settings: AdminSettings;
  onDirtyChange: (dirty: boolean) => void;
}

const toForm = (settings: AdminSettings) => toAiForm(settings.ai.values);

/** Hạn mức AI: tổng lượt mỗi ngày của hệ thống, lượt giải thích đáp án của mỗi học viên */
export function AiSettingsForm({ settings, onDirtyChange }: SettingsFormProps) {
  const { ranges } = settings.ai;
  const [updateAi] = useUpdateAiSettingsMutation();
  const schema = useMemo(() => aiSchema(ranges), [ranges]);
  const form = useForm<AiForm>({
    resolver: zodResolver(schema),
    defaultValues: toForm(settings),
    mode: 'onChange',
  });
  const state = useSettingsForm({
    group: 'ai',
    form,
    settings,
    toForm,
    onDirtyChange,
    save: async (values, updatedAt) => {
      const response = await updateAi({
        dailyBudget: Number(values.dailyBudget),
        explainDailyLimit: Number(values.explainDailyLimit),
        updatedAt,
      }).unwrap();
      return response.data;
    },
  });
  const { errors } = form.formState;

  return (
    <SettingsCard
      title="Hạn mức AI"
      description="Giới hạn số lượt gọi AI mỗi ngày. Thay đổi áp dụng ngay trong ngày, hết lượt thì chờ sang ngày mới."
      info={settings.ai}
      state={state}
      onSubmit={form.handleSubmit(async (values) => {
        await state.submit(values);
      })}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <FormField
            id="ai-daily-budget"
            label="Tổng lượt AI mỗi ngày"
            required
            hint={<span className="text-xs text-subtle">{rangeHint(ranges.dailyBudget)}</span>}
            error={errors.dailyBudget?.message}
          >
            <input
              id="ai-daily-budget"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!!errors.dailyBudget}
              className={inputClass}
              // Lượt của một học viên không được vượt tổng: đổi tổng thì kiểm tra lại ô kia
              {...form.register('dailyBudget', {
                onChange: () => void form.trigger('explainDailyLimit'),
              })}
            />
          </FormField>
          <p className="mt-1.5 px-1 text-xs text-subtle">
            Tính chung giải thích đáp án và chấm Speaking, Writing. Hết lượt thì bài Speaking,
            Writing chờ chấm sang ngày mới.
          </p>
        </div>

        <div>
          <FormField
            id="ai-explain-limit"
            label="Lượt giải thích / học viên / ngày"
            required
            hint={
              <span className="text-xs whitespace-nowrap text-subtle">
                {rangeHint(ranges.explainDailyLimit)}
              </span>
            }
            error={errors.explainDailyLimit?.message}
          >
            <input
              id="ai-explain-limit"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!!errors.explainDailyLimit}
              className={inputClass}
              {...form.register('explainDailyLimit')}
            />
          </FormField>
          <p className="mt-1.5 px-1 text-xs text-subtle">
            Lời giải thích đã có sẵn không tính lượt. Học viên đã dùng nhiều hơn mức mới thì còn 0
            lượt.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}
