import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Minus, Plus, Save, Target } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useUpdateProfileMutation } from '@/api/generated';
import { FieldError } from '@/components/form/FieldError';
import { FormAlert } from '@/components/form/FormAlert';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { applyFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { useSavedFlag } from '../hooks/use-saved-flag';
import {
  TARGET_SCORE_MAX,
  TARGET_SCORE_MIN,
  TARGET_SCORE_STEP,
  targetScoreSchema,
  type TargetScoreValues,
} from '../schemas';
import { SaveFeedback } from './SaveFeedback';
import { SectionCard } from './SectionCard';

const QUICK_PICKS = [550, 650, 750, 850, 950];
const DEFAULT_TARGET = 750; // gợi ý khi học viên chưa đặt mục tiêu

const clamp = (value: number) => Math.min(TARGET_SCORE_MAX, Math.max(TARGET_SCORE_MIN, value));

/**
 * Điểm mục tiêu TOEIC LR: ô số kèm nút −/+ (bước 5), chip chọn nhanh và thanh trượt,
 * cả ba cùng điều khiển một giá trị trong form.
 */
export function TargetScoreCard({ targetScore }: { targetScore: number | null }) {
  const [updateProfile] = useUpdateProfileMutation();
  const { saved, markSaved, clearSaved } = useSavedFlag();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(targetScoreSchema),
    defaultValues: { targetScore: targetScore ?? DEFAULT_TARGET },
    mode: 'onChange',
  });
  const value = useWatch({ control, name: 'targetScore' });
  const validValue = Number.isFinite(value) ? clamp(value) : DEFAULT_TARGET;
  const percent = ((validValue - TARGET_SCORE_MIN) / (TARGET_SCORE_MAX - TARGET_SCORE_MIN)) * 100;
  // Chưa đặt mục tiêu thì cho lưu ngay giá trị gợi ý
  const canSave = isDirty || targetScore === null;
  const formError = errors.root?.server;

  const change = (next: number) =>
    setValue('targetScore', clamp(next), { shouldDirty: true, shouldValidate: true });

  const onSubmit = async (values: TargetScoreValues) => {
    clearSaved();
    try {
      const { data } = await updateProfile({ targetScore: values.targetScore }).unwrap();
      reset({ targetScore: data.student?.targetScore ?? values.targetScore });
      markSaved();
    } catch (error) {
      const apiError = toApiError(error);
      if (applyFieldErrors(apiError, setError, ['targetScore'])) return;
      setError('root.server', { type: apiError.code, message: apiError.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionCard
        icon={Target}
        title="Mục tiêu điểm TOEIC"
        description={`Tổng điểm Listening + Reading bạn muốn đạt (${TARGET_SCORE_MIN}–${TARGET_SCORE_MAX}, bước ${TARGET_SCORE_STEP} điểm)`}
        footer={
          <>
            <SaveFeedback show={saved} message="Đã lưu mục tiêu" />
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl px-4"
              disabled={!isDirty || isSubmitting}
              onClick={() => reset()}
            >
              Hủy
            </Button>
            <SubmitButton
              loading={isSubmitting}
              disabled={!canSave}
              className="h-10 w-auto px-5 text-sm"
            >
              <Save />
              Lưu mục tiêu
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="targetScore" className="text-sm font-semibold text-foreground">
              Điểm mục tiêu đang đặt
            </label>
            <p className="mt-0.5 text-xs text-balance text-subtle">
              {targetScore === null
                ? 'Bạn chưa đặt mục tiêu, gợi ý 750 điểm'
                : 'Hệ thống gợi ý lộ trình và đề thi phù hợp với mục tiêu này'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Giảm 5 điểm"
              className="size-10 rounded-xl"
              disabled={validValue <= TARGET_SCORE_MIN}
              onClick={() => change(validValue - TARGET_SCORE_STEP)}
            >
              <Minus />
            </Button>
            <div className="flex h-12 items-center gap-1.5 rounded-xl border-2 border-primary bg-white px-3 focus-within:ring-3 focus-within:ring-primary/20">
              <input
                id="targetScore"
                type="number"
                inputMode="numeric"
                min={TARGET_SCORE_MIN}
                max={TARGET_SCORE_MAX}
                step={TARGET_SCORE_STEP}
                aria-invalid={!!errors.targetScore}
                className="w-16 bg-transparent text-right text-2xl font-extrabold text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                {...register('targetScore', { valueAsNumber: true })}
              />
              <span className="text-sm font-medium text-muted-foreground">điểm</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Tăng 5 điểm"
              className="size-10 rounded-xl"
              disabled={validValue >= TARGET_SCORE_MAX}
              onClick={() => change(validValue + TARGET_SCORE_STEP)}
            >
              <Plus />
            </Button>
          </div>
        </div>
        <FieldError message={errors.targetScore?.message} />

        <p className="mt-5 text-sm font-semibold text-foreground">Mốc điểm phổ biến:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_PICKS.map((pick) => {
            const active = value === pick;
            return (
              <button
                key={pick}
                type="button"
                aria-pressed={active}
                onClick={() => change(pick)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-white shadow-sm shadow-primary/30'
                    : 'border-border bg-white text-foreground hover:border-primary/40 hover:bg-accent',
                )}
              >
                {active && <Check className="size-3.5" />}
                {pick} điểm
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-xs text-subtle">
            <span>{TARGET_SCORE_MIN} điểm</span>
            <span className="font-semibold text-primary">
              {validValue} / {TARGET_SCORE_MAX} điểm
            </span>
            <span>{TARGET_SCORE_MAX} điểm</span>
          </div>
          <input
            type="range"
            aria-label="Kéo để chọn điểm mục tiêu"
            min={TARGET_SCORE_MIN}
            max={TARGET_SCORE_MAX}
            step={TARGET_SCORE_STEP}
            value={validValue}
            onChange={(event) => change(Number(event.target.value))}
            style={{
              background: `linear-gradient(to right, var(--primary) ${percent}%, var(--accent) ${percent}%)`,
            }}
            className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>

        {formError?.message && (
          <div className="mt-5">
            <FormAlert message={formError.message} onClose={() => clearErrors('root.server')} />
          </div>
        )}
      </SectionCard>
    </form>
  );
}
