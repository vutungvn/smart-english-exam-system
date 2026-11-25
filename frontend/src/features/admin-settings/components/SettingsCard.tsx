import { useState, type FormEventHandler, type ReactNode } from 'react';
import { History, RotateCcw, RotateCw, Save, Undo2 } from 'lucide-react';
import type { SettingEditor } from '@/api/generated';
import { FormAlert } from '@/components/form/FormAlert';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/features/profile/format';
import { SuccessBanner } from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import type { SettingsFormState } from '../hooks/use-settings-form';
import { ResetSettingsDialog } from './ResetSettingsDialog';

interface SettingsCardProps {
  title: string;
  description: ReactNode;
  info: { isDefault: boolean; updatedAt: string; updatedBy: SettingEditor | null };
  state: SettingsFormState;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

/** Khung chung của một nhóm cấu hình: nhãn trạng thái, người sửa gần nhất, nút Lưu / Hủy / Khôi phục */
export function SettingsCard({
  title,
  description,
  info,
  state,
  onSubmit,
  children,
}: SettingsCardProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const { isDirty, busy, reloading, conflict, error, flash } = state;

  return (
    <section className="rounded-3xl border border-border bg-white shadow-2xs">
      <header className="border-b border-border p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              info.isDefault ? 'bg-slate-100 text-slate-700' : 'bg-accent text-brand',
            )}
          >
            {info.isDefault ? 'Mặc định' : 'Đã tùy chỉnh'}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
          <History className="size-3.5 shrink-0" />
          {info.updatedBy
            ? `Sửa gần nhất: ${info.updatedBy.fullName} · ${formatDateTime(info.updatedAt)}`
            : 'Chưa có ai chỉnh sửa'}
        </p>
      </header>

      <form noValidate onSubmit={onSubmit}>
        <div className="space-y-5 p-5 sm:p-6">
          {flash && <SuccessBanner message={flash} onClose={state.clearFlash} />}
          {conflict && (
            <FormAlert message="Cấu hình đã được sửa ở nơi khác. Tải bản mới nhất rồi sửa lại; thay đổi chưa lưu ở đây sẽ mất.">
              <button
                type="button"
                disabled={reloading}
                onClick={() => void state.reload()}
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline disabled:opacity-60"
              >
                <RotateCw className={cn('size-3.5', reloading && 'animate-spin')} />
                {reloading ? 'Đang tải…' : 'Tải bản mới nhất'}
              </button>
            </FormAlert>
          )}
          {error && <FormAlert message={error} onClose={state.clearError} />}
          {children}
        </div>

        <footer className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:p-6">
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4 sm:mr-auto"
            disabled={busy || info.isDefault}
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw />
            Khôi phục mặc định
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            disabled={busy || !isDirty}
            onClick={state.discard}
          >
            <Undo2 />
            Hủy thay đổi
          </Button>
          <SubmitButton
            loading={busy}
            disabled={!isDirty}
            className="h-10 px-5 text-sm sm:w-auto sm:min-w-32"
          >
            {!busy && <Save />}
            Lưu cấu hình
          </SubmitButton>
        </footer>
      </form>

      <ResetSettingsDialog
        open={resetOpen}
        title={title}
        busy={busy}
        dirty={isDirty}
        onClose={() => setResetOpen(false)}
        onConfirm={async () => {
          await state.restoreDefaults();
          setResetOpen(false);
        }}
      />
    </section>
  );
}
