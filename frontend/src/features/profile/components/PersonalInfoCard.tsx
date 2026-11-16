import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, Info, Lock, Save, UserRound } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useUpdateProfileMutation, type MeProfile } from '@/api/generated';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { IconInput } from '@/components/form/IconInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/hooks/hooks';
import { applyFieldErrors } from '@/lib/form-errors';
import { ROLE_LABELS } from '@/lib/user-display';
import { userUpdated } from '@/store/slice/auth-slice';
import { useSavedFlag } from '../hooks/use-saved-flag';
import { personalInfoSchema, type PersonalInfoValues } from '../schemas';
import { SaveFeedback } from './SaveFeedback';
import { SectionCard } from './SectionCard';

// Chỉ sửa được họ tên; email là định danh đăng nhập nên không đổi
export function PersonalInfoCard({ profile }: { profile: MeProfile }) {
  const dispatch = useAppDispatch();
  const [updateProfile] = useUpdateProfileMutation();
  const { saved, markSaved, clearSaved } = useSavedFlag();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { fullName: profile.fullName },
    mode: 'onTouched',
  });
  const formError = errors.root?.server;

  const onSubmit = async (values: PersonalInfoValues) => {
    clearSaved();
    try {
      const { data } = await updateProfile({ fullName: values.fullName }).unwrap();
      reset({ fullName: data.fullName }); // giá trị đã lưu thành mốc mới, nút Lưu tắt lại
      dispatch(userUpdated({ fullName: data.fullName })); // thanh trên, lời chào đổi ngay
      markSaved();
    } catch (error) {
      const apiError = toApiError(error);
      if (applyFieldErrors(apiError, setError, ['fullName'])) return;
      setError('root.server', { type: apiError.code, message: apiError.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionCard
        icon={UserRound}
        title="Thông tin cá nhân"
        description="Cập nhật thông tin hiển thị cơ bản của bạn trên nền tảng"
        footer={
          <>
            <SaveFeedback show={saved} message="Đã lưu thông tin" />
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
              disabled={!isDirty}
              className="h-10 w-auto px-5 text-sm"
            >
              <Save />
              Lưu thông tin
            </SubmitButton>
          </>
        }
      >
        <div className="space-y-5">
          <FormField id="fullName" label="Họ và tên" required error={errors.fullName?.message}>
            <IconInput
              id="fullName"
              required
              icon={<UserRound />}
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
            />
            <p className="px-1 text-xs text-subtle">
              2–100 ký tự. Tên hiển thị trong hệ thống và báo cáo học tập.
            </p>
          </FormField>

          <FormField id="email" label="Địa chỉ email">
            <IconInput
              id="email"
              type="email"
              icon={<Lock />}
              value={profile.email}
              readOnly
              className="cursor-not-allowed bg-slate-100 text-muted-foreground focus-visible:bg-slate-100"
            />
            <p className="flex items-center gap-1 px-1 text-xs text-subtle">
              <Info className="size-3.5" />
              Email dùng để đăng nhập, không thể thay đổi
            </p>
          </FormField>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-700">Vai trò hệ thống</span>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/20 bg-accent px-3 py-1.5 text-sm font-semibold text-brand">
              <GraduationCap className="size-4" />
              {ROLE_LABELS[profile.role]}
            </span>
          </div>

          {formError?.message && (
            <FormAlert message={formError.message} onClose={() => clearErrors('root.server')} />
          )}
        </div>
      </SectionCard>
    </form>
  );
}
