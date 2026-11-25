import { useCallback, useEffect, useState } from 'react';
import { Link, useBlocker, useSearchParams } from 'react-router';
import { History } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetAdminSettingsQuery, type SettingGroup } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { AUDIT_LOGS_PATH } from '@/features/admin-audit-logs/labels';
import { ErrorState } from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import { AiSettingsForm } from '../components/AiSettingsForm';
import { RecordingSettingsForm } from '../components/RecordingSettingsForm';
import { ScoringSettingsForm } from '../components/ScoringSettingsForm';
import { SETTING_TABS } from '../labels';

const NO_CHANGES: Record<SettingGroup, boolean> = { scoring: false, ai: false, recording: false };

/**
 * Trang Cấu hình hệ thống `/admin/settings` (SPRINT-69): quy đổi điểm, hạn mức AI, ghi âm Speaking.
 * Cả ba form luôn được gắn vào trang, đổi tab chỉ ẩn/hiện nên không mất phần đang sửa
 */
export function AdminSettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = SETTING_TABS.find(({ value }) => value === params.get('tab'))?.value ?? 'scoring';
  // Cấu hình có thể vừa được sửa ở tab khác: mở trang là tải lại
  const { data, error, isLoading, refetch } = useGetAdminSettingsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const settings = data?.data;

  const [dirty, setDirty] = useState(NO_CHANGES);
  const anyDirty = Object.values(dirty).some(Boolean);
  const markDirty = useCallback(
    (group: SettingGroup, value: boolean) =>
      setDirty((current) => (current[group] === value ? current : { ...current, [group]: value })),
    [],
  );
  const onScoringDirty = useCallback((value: boolean) => markDirty('scoring', value), [markDirty]);
  const onAiDirty = useCallback((value: boolean) => markDirty('ai', value), [markDirty]);
  const onRecordingDirty = useCallback(
    (value: boolean) => markDirty('recording', value),
    [markDirty],
  );

  // Đóng tab, tải lại trang: trình duyệt hỏi; bấm link trong ứng dụng: hộp thoại bên dưới
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [anyDirty]);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      anyDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  return (
    <div className="space-y-6">
      <title>Cấu hình hệ thống – Smart English Exam</title>
      <PageHeader
        title="Cấu hình hệ thống"
        description="Chỉnh tham số vận hành. Lưu là có hiệu lực ngay và được ghi vào nhật ký kiểm toán."
        actions={
          <Link
            to={`${AUDIT_LOGS_PATH}?entity=setting`}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'h-10 rounded-xl bg-white px-4 font-semibold shadow-2xs',
            )}
          >
            <History />
            Nhật ký thay đổi
          </Link>
        }
      />

      {isLoading ? (
        <SettingsSkeleton />
      ) : !settings ? (
        <section className="rounded-3xl border border-border bg-white shadow-2xs">
          <ErrorState
            message={error ? toApiError(error).message : 'Không tải được dữ liệu'}
            onRetry={() => void refetch()}
          />
        </section>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Nhóm cấu hình"
            className="flex gap-0.5 overflow-x-auto rounded-2xl border border-border bg-white p-1.5 shadow-2xs sm:gap-1"
          >
            {SETTING_TABS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`settings-tab-${value}`}
                aria-selected={tab === value}
                aria-controls={`settings-panel-${value}`}
                onClick={() => setParams({ tab: value }, { replace: true })}
                className={cn(
                  'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-primary/30 sm:flex-none sm:gap-2 sm:px-4 sm:text-sm',
                  tab === value
                    ? 'bg-accent text-brand'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-foreground',
                )}
              >
                <Icon className="hidden size-4 sm:block" />
                {label}
                {dirty[value] && (
                  <span className="size-1.5 rounded-full bg-primary" title="Có thay đổi chưa lưu" />
                )}
              </button>
            ))}
          </div>

          {SETTING_TABS.map(({ value }) => (
            <div
              key={value}
              role="tabpanel"
              id={`settings-panel-${value}`}
              aria-labelledby={`settings-tab-${value}`}
              hidden={tab !== value}
            >
              {value === 'scoring' && (
                <ScoringSettingsForm
                  settings={settings}
                  active={tab === 'scoring'}
                  onDirtyChange={onScoringDirty}
                />
              )}
              {value === 'ai' && <AiSettingsForm settings={settings} onDirtyChange={onAiDirty} />}
              {value === 'recording' && (
                <RecordingSettingsForm settings={settings} onDirtyChange={onRecordingDirty} />
              )}
            </div>
          ))}
        </>
      )}

      <AppDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="Rời trang khi chưa lưu?"
        description="Thay đổi cấu hình chưa lưu sẽ mất."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-xl px-4"
              onClick={() => blocker.reset?.()}
            >
              Ở lại
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-destructive px-4 text-white hover:bg-destructive/90"
              onClick={() => blocker.proceed?.()}
            >
              Rời trang
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Nhóm chưa lưu:{' '}
          {SETTING_TABS.filter(({ value }) => dirty[value])
            .map(({ label }) => label)
            .join(', ')}
          .
        </p>
      </AppDialog>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-13 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
    </div>
  );
}
