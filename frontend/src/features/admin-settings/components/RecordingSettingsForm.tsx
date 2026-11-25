import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, useUpdateRecordingSettingsMutation, type AdminSettings } from '@/api/generated';
import { FormField } from '@/components/form/FormField';
import { inputClass } from '@/features/question-bank/form/styles';
import { useAppDispatch } from '@/hooks/hooks';
import { useSettingsForm } from '../hooks/use-settings-form';
import { rangeHint } from '../labels';
import { recordingSchema, toRecordingForm, type RecordingForm } from '../schemas';
import { RecordingImpactDialog, type RecordingImpactState } from './RecordingImpactDialog';
import { SettingsCard } from './SettingsCard';

interface SettingsFormProps {
  settings: AdminSettings;
  onDirtyChange: (dirty: boolean) => void;
}

const toForm = (settings: AdminSettings) => toRecordingForm(settings.recording.values);

/** Số ngày giữ bản ghi âm Speaking; giảm số ngày thì hỏi lại vì bản ghi quá hạn bị xóa vĩnh viễn */
export function RecordingSettingsForm({ settings, onDirtyChange }: SettingsFormProps) {
  const { ranges, values: saved } = settings.recording;
  const dispatch = useAppDispatch();
  const [updateRecording] = useUpdateRecordingSettingsMutation();
  const [impact, setImpact] = useState<RecordingImpactState | null>(null);
  const [counting, setCounting] = useState(false);
  const schema = useMemo(() => recordingSchema(ranges), [ranges]);
  const form = useForm<RecordingForm>({
    resolver: zodResolver(schema),
    defaultValues: toForm(settings),
    mode: 'onChange',
  });
  const state = useSettingsForm({
    group: 'recording',
    form,
    settings,
    toForm,
    onDirtyChange,
    save: async (values, updatedAt) => {
      const response = await updateRecording({
        retentionDays: Number(values.retentionDays),
        updatedAt,
      }).unwrap();
      return response.data;
    },
  });
  const error = form.formState.errors.retentionDays?.message;

  const submit = async (values: RecordingForm) => {
    const days = Number(values.retentionDays);
    if (days < saved.retentionDays) {
      setCounting(true);
      const count = await dispatch(
        api.endpoints.getRecordingImpact.initiate(days, { forceRefetch: true, subscribe: false }),
      )
        .unwrap()
        .then((response) => response.data.recordingCount)
        .catch(() => null);
      setCounting(false);
      // Không bản ghi nào bị ảnh hưởng thì lưu luôn
      if (count !== 0) {
        setImpact({ days, count });
        return;
      }
    }
    await state.submit(values);
  };

  return (
    <>
      <SettingsCard
        title="Ghi âm Speaking"
        description="Bài nói là dữ liệu cá nhân nên chỉ giữ trong thời gian có hạn, quá hạn hệ thống tự xóa lúc 3 giờ sáng mỗi ngày."
        info={settings.recording}
        state={{ ...state, busy: state.busy || counting }}
        onSubmit={form.handleSubmit(submit)}
      >
        <div className="max-w-md">
          <FormField
            id="recording-retention-days"
            label="Số ngày giữ bản ghi âm sau khi nộp bài"
            required
            hint={<span className="text-xs text-subtle">{rangeHint(ranges.retentionDays)}</span>}
            error={error}
          >
            <input
              id="recording-retention-days"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!!error}
              className={inputClass}
              {...form.register('retentionDays')}
            />
          </FormField>
          <p className="mt-1.5 px-1 text-xs text-subtle">
            Áp dụng cả cho bản ghi cũ. Học viên đã đồng ý lưu tối đa {ranges.retentionDays.max} ngày
            nên không đặt dài hơn được.
          </p>
        </div>
      </SettingsCard>

      <RecordingImpactDialog
        impact={impact}
        busy={state.busy}
        onClose={() => setImpact(null)}
        onConfirm={async () => {
          await state.submit(form.getValues());
          setImpact(null);
        }}
      />
    </>
  );
}
