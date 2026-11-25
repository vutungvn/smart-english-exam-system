import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { useUpdateScoringSettingsMutation, type AdminSettings } from '@/api/generated';
import { SegmentedControl } from '@/features/question-bank/components/FilterControls';
import { useSettingsForm } from '../hooks/use-settings-form';
import { SCORING_SKILLS, type ScoringSkill } from '../labels';
import {
  drawablePoints,
  firstInvalidSkill,
  scoringSchema,
  toScoringDto,
  toScoringForm,
  type ScoringForm,
} from '../schemas';
import { ConversionChart } from './ConversionChart';
import { ConversionTable } from './ConversionTable';
import { SettingsCard } from './SettingsCard';

interface ScoringSettingsFormProps {
  settings: AdminSettings;
  /** Tab đang mở; biểu đồ không vẽ khi tab ẩn (khung rộng 0) */
  active: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

const toForm = (settings: AdminSettings) => toScoringForm(settings.scoring.values);

/** Bảng quy đổi điểm TOEIC của bốn kỹ năng, lưu chung một lần */
export function ScoringSettingsForm({ settings, active, onDirtyChange }: ScoringSettingsFormProps) {
  const { rules, defaults } = settings.scoring;
  const [updateScoring] = useUpdateScoringSettingsMutation();
  const [skill, setSkill] = useState<ScoringSkill>('listening');
  const schema = useMemo(() => scoringSchema(rules), [rules]);
  const form = useForm<ScoringForm>({
    resolver: zodResolver(schema),
    defaultValues: toForm(settings),
    mode: 'onChange',
  });
  const state = useSettingsForm({
    group: 'scoring',
    form,
    settings,
    toForm,
    onDirtyChange,
    save: async (values, updatedAt) => {
      const response = await updateScoring({ ...toScoringDto(values), updatedAt }).unwrap();
      return response.data;
    },
  });
  const rows = useWatch({ control: form.control, name: skill });
  const { errors, dirtyFields } = form.formState;
  const meta = SCORING_SKILLS.find(({ value }) => value === skill) ?? SCORING_SKILLS[0];

  // Lỗi nằm ở kỹ năng đang không mở thì chuyển tới đó để thấy ô sai
  const showInvalidSkill = (invalid: Partial<Record<string, unknown>>) => {
    const first = firstInvalidSkill(invalid);
    if (first && invalid[skill] === undefined) setSkill(first);
  };

  return (
    <SettingsCard
      title="Quy đổi điểm TOEIC"
      description="Đổi kết quả làm bài ra thang điểm TOEIC. Giữa hai mốc, hệ thống tự nội suy rồi làm tròn theo bước điểm."
      info={settings.scoring}
      state={state}
      onSubmit={form.handleSubmit(async (values) => {
        if (await state.submit(values)) return;
        // Lỗi server vừa gắn vào ô: đọc qua getFieldState vì formState ở đây là của lần vẽ trước
        const invalid = SCORING_SKILLS.filter((item) => form.getFieldState(item.value).invalid);
        showInvalidSkill(Object.fromEntries(invalid.map((item) => [item.value, true])));
      }, showInvalidSkill)}
    >
      <p className="flex items-start gap-2.5 rounded-2xl bg-accent p-4 text-sm text-slate-700">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          Đây là <strong>bảng tham khảo</strong>, không phải bảng chính thức của ETS. Thay đổi chỉ
          áp dụng cho bài chấm sau khi lưu, điểm cũ giữ nguyên; bài Speaking, Writing được giáo viên
          chấm lại thì tính theo bảng mới.
        </span>
      </p>

      <SegmentedControl
        label="Kỹ năng"
        value={skill}
        onChange={(value) => value && setSkill(value)}
        options={SCORING_SKILLS.map(({ value, label }) => ({
          value,
          label: (
            <span className="inline-flex items-center gap-1.5">
              {label}
              {errors[value] ? (
                <span className="size-1.5 rounded-full bg-destructive" title="Có lỗi" />
              ) : (
                dirtyFields[value] && (
                  <span className="size-1.5 rounded-full bg-primary" title="Chưa lưu" />
                )
              )}
            </span>
          ),
        }))}
        className="grid grid-cols-2 sm:flex"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ConversionTable
          key={skill}
          form={form}
          skill={meta}
          rule={rules[skill]}
          count={rules.points}
        />
        <div className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
          {active && (
            <ConversionChart
              points={drawablePoints(rows)}
              defaults={defaults[skill]}
              rule={rules[skill]}
              rawLabel={meta.rawLabel}
              label={meta.label}
              color={meta.color}
            />
          )}
        </div>
      </div>
    </SettingsCard>
  );
}
