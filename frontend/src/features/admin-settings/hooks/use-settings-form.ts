import { useEffect, useRef, useState } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { toApiError } from '@/api/errors';
import {
  useGetAdminSettingsQuery,
  useResetSettingsMutation,
  type AdminSettings,
  type SettingGroup,
} from '@/api/generated';
import { applyFieldErrors } from '@/lib/form-errors';

interface UseSettingsFormOptions<F extends FieldValues> {
  group: SettingGroup;
  form: UseFormReturn<F>;
  settings: AdminSettings;
  /** Giá trị của nhóm đổi sang giá trị ô nhập */
  toForm: (settings: AdminSettings) => F;
  /** Gọi PATCH của nhóm, trả toàn bộ cấu hình mới */
  save: (values: F, updatedAt: string) => Promise<AdminSettings>;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Phần chung của ba form cấu hình: lưu, khôi phục mặc định, lỗi từng trường, xung đột 409.
 * Form giữ phiên bản (updatedAt) của lần đọc nó đang hiển thị; nơi khác sửa trong lúc đang gõ thì
 * không ghi đè phần đang nhập, lúc lưu server báo 409
 */
export function useSettingsForm<F extends FieldValues>({
  group,
  form,
  settings,
  toForm,
  save,
  onDirtyChange,
}: UseSettingsFormOptions<F>) {
  const { refetch } = useGetAdminSettingsQuery();
  const [resetSettings] = useResetSettingsMutation();
  const version = useRef(settings[group].updatedAt);
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string>();
  const [flash, setFlash] = useState<string>();
  const { isDirty } = form.formState;

  const show = (next: AdminSettings) => {
    version.current = next[group].updatedAt;
    form.reset(toForm(next));
    setConflict(false);
    setError(undefined);
  };

  // Dữ liệu server đổi (lưu nhóm khác, tải lại) mà form chưa sửa gì thì hiện bản mới
  useEffect(() => {
    if (isDirty || version.current === settings[group].updatedAt) return;
    version.current = settings[group].updatedAt;
    form.reset(toForm(settings));
  }, [settings, group, isDirty, form, toForm]);

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const fail = (cause: unknown) => {
    const apiError = toApiError(cause);
    if (apiError.code === 'VERSION_CONFLICT') {
      setConflict(true);
      return;
    }
    const fields = apiError.fieldErrors.map(({ field }) => field as Path<F>);
    if (!applyFieldErrors(apiError, form.setError, fields)) setError(apiError.message);
  };

  /** Trả true khi lưu xong */
  const submit = async (values: F): Promise<boolean> => {
    setBusy(true);
    setError(undefined);
    setFlash(undefined);
    try {
      show(await save(values, version.current));
      setFlash('Đã lưu cấu hình, có hiệu lực ngay.');
      return true;
    } catch (cause) {
      fail(cause);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const restoreDefaults = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    setFlash(undefined);
    try {
      const { data } = await resetSettings({
        group,
        resetSettingsDto: { updatedAt: version.current },
      }).unwrap();
      show(data);
      setFlash('Đã khôi phục giá trị mặc định.');
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy(false);
    }
  };

  const reload = async (): Promise<void> => {
    setReloading(true);
    try {
      show((await refetch().unwrap()).data);
    } catch (cause) {
      setConflict(false);
      setError(toApiError(cause).message);
    } finally {
      setReloading(false);
    }
  };

  const discard = () => {
    form.reset();
    setConflict(false);
    setError(undefined);
    setFlash(undefined);
  };

  return {
    isDirty,
    busy,
    reloading,
    conflict,
    error,
    flash,
    submit,
    restoreDefaults,
    reload,
    discard,
    clearError: () => setError(undefined),
    clearFlash: () => setFlash(undefined),
  };
}

/** Phần SettingsCard cần, không phụ thuộc kiểu ô nhập của từng form */
export type SettingsFormState = Omit<ReturnType<typeof useSettingsForm>, 'submit'>;
