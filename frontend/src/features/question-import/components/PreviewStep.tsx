import { useState, type ReactNode } from 'react';
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Download,
  FileArchive,
  Loader2,
  Lock,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useConfirmQuestionImportMutation,
  type ImportIssue,
  type ImportPreview,
  type ImportResult,
  type ImportStatus,
} from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/features/question-bank/components/FilterControls';
import { STATUS_META } from '@/features/question-bank/toeic';
import { cn } from '@/lib/utils';
import { useFileDownload } from '../hooks/use-file-download';
import { formatTime } from '../import-meta';
import { ImportCard } from './ImportCard';
import { ImportQuestionTable } from './ImportQuestionTable';
import { IssueTable } from './IssueTable';
import { PartSummary } from './PartSummary';

type Tab = 'errors' | 'warnings' | 'questions';

interface PreviewStepProps {
  preview: ImportPreview;
  /** Về bước 1, kèm thông báo nếu có (phiên hết hạn…) */
  onBack: (notice?: string) => void;
  onImported: (result: ImportResult) => void;
}

/** details của lỗi 422 QUESTION_IMPORT_HAS_ERRORS là danh sách lỗi mới theo sheet/dòng/cột */
function issuesOf(cause: unknown): ImportIssue[] {
  const details = (cause as { data?: { error?: { details?: unknown } } }).data?.error?.details;
  return Array.isArray(details) ? (details as ImportIssue[]) : [];
}

export function PreviewStep({ preview, onBack, onImported }: PreviewStepProps) {
  // Lúc xác nhận server kiểm tra lại: ngân hàng đổi (có người nhập trùng mã) thì có lỗi mới
  const [newErrors, setNewErrors] = useState<ImportIssue[] | null>(null);
  const errors = newErrors ?? preview.errors;
  const errorCount = newErrors?.length ?? preview.errorCount;
  const canConfirm = preview.canConfirm && !newErrors;

  const [tab, setTab] = useState<Tab>(canConfirm ? 'questions' : 'errors');
  const [status, setStatus] = useState<ImportStatus>('DRAFT');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string>();
  const [confirmImport, { isLoading }] = useConfirmQuestionImportMutation();
  const download = useFileDownload();

  const openConfirm = () => {
    // Bản xem trước chỉ giữ 1 giờ ở server: hết hạn thì không mở hộp thoại cho mất công
    if (Date.now() > Date.parse(preview.expiresAt)) {
      onBack('Bản xem trước đã hết hạn (giữ trong 1 giờ). Hãy tải tệp lên lại.');
      return;
    }
    setConfirmError(undefined);
    setDialogOpen(true);
  };

  const submit = async () => {
    setConfirmError(undefined);
    try {
      const result = await confirmImport({
        token: preview.token,
        confirmImportDto: { status },
      }).unwrap();
      onImported(result.data);
    } catch (cause) {
      const error = toApiError(cause);
      if (error.code === 'QUESTION_IMPORT_NOT_FOUND') {
        onBack('Bản xem trước đã hết hạn hoặc đã được nhập. Hãy tải tệp lên lại.');
      } else if (error.code === 'QUESTION_IMPORT_HAS_ERRORS') {
        setNewErrors(issuesOf(cause));
        setTab('errors');
        setDialogOpen(false);
      } else {
        // Đang nhập (bấm 2 lần), trùng mã đúng lúc nhập, kho tệp lỗi, mất mạng
        setConfirmError(error.message);
      }
    }
  };

  const tabs: { id: Tab; label: string; count: number; dot?: string }[] = [
    { id: 'errors', label: 'Lỗi', count: errorCount, dot: 'bg-destructive' },
    { id: 'warnings', label: 'Cảnh báo', count: preview.warningCount, dot: 'bg-amber-500' },
    { id: 'questions', label: 'Câu sẽ nhập', count: preview.questionCount },
  ];

  return (
    <div className="space-y-6 pb-4">
      <StatusBanner
        canConfirm={canConfirm}
        errorCount={errorCount}
        warningCount={preview.warningCount}
        changed={!!newErrors}
        actions={
          <>
            {!newErrors && errorCount + preview.warningCount > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={download.pending === 'issues'}
                onClick={() => void download.downloadIssues(preview.token)}
                className="h-10 rounded-xl bg-white px-4 font-semibold"
              >
                {download.pending === 'issues' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
                {errorCount > 0 ? 'Tải danh sách lỗi (.xlsx)' : 'Tải danh sách cảnh báo'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onBack()}
              className="h-10 rounded-xl bg-white px-4 font-semibold"
            >
              <RefreshCw />
              Chọn tệp khác
            </Button>
          </>
        }
      />
      {download.error && (
        <p role="alert" className="text-sm text-destructive">
          {download.error}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Tệp đã tải" wide>
          <span className="flex items-center gap-2">
            <FileArchive className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold" title={preview.fileName}>
              {preview.fileName}
            </span>
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs font-normal text-subtle">
            <Clock className="size-3" />
            Hết hạn lúc {formatTime(preview.expiresAt)}
          </span>
        </Stat>
        <Stat label="Nhóm hợp lệ">{preview.groupCount}</Stat>
        <Stat label="Câu hợp lệ">{preview.questionCount}</Stat>
        <Stat label="Tệp media">{preview.mediaCount}</Stat>
        <Stat label="Lỗi" tone={errorCount > 0 ? 'error' : undefined}>
          {errorCount}
        </Stat>
        <Stat label="Cảnh báo" tone={preview.warningCount > 0 ? 'warning' : undefined}>
          {preview.warningCount}
        </Stat>
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <ImportCard className="lg:col-span-2 lg:order-2">
          <div
            role="tablist"
            className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-2"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
                  tab === item.id
                    ? 'border-primary text-brand'
                    : 'border-transparent text-slate-500 hover:text-foreground',
                )}
              >
                {item.dot && item.count > 0 && (
                  <span className={cn('size-2 rounded-full', item.dot)} />
                )}
                {item.label}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 tabular-nums">
                  {item.count}
                </span>
              </button>
            ))}
          </div>
          <div role="tabpanel" className="pb-2">
            {tab === 'errors' && <IssueTable issues={errors} total={errorCount} tone="error" />}
            {tab === 'warnings' && (
              <IssueTable issues={preview.warnings} total={preview.warningCount} tone="warning" />
            )}
            {tab === 'questions' && <ImportQuestionTable rows={preview.questions} />}
          </div>
        </ImportCard>

        <div className="lg:order-1">
          <PartSummary parts={preview.parts} />
        </div>
      </div>

      {/* Thanh hành động bám đáy màn hình khi cuộn bảng dài */}
      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-white/95 p-4 shadow-lg shadow-slate-900/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        {canConfirm ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-semibold text-foreground">Trạng thái sau khi nhập</span>
            <SegmentedControl<ImportStatus>
              label="Trạng thái sau khi nhập"
              className="flex sm:w-64"
              value={status}
              onChange={(value) => value && setStatus(value)}
              options={[
                { value: 'DRAFT', label: 'Nháp' },
                { value: 'ACTIVE', label: 'Đang dùng' },
              ]}
            />
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <CircleAlert className="size-4 shrink-0" />
            Còn {errorCount} lỗi cần sửa trước khi nhập
          </p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onBack()}
            className="h-11 flex-1 rounded-xl bg-white px-4 font-semibold sm:flex-none"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={openConfirm}
            className="h-11 flex-1 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold shadow-md shadow-primary/30 sm:flex-none"
          >
            {canConfirm ? <Upload /> : <Lock />}
            {canConfirm ? `Xác nhận nhập ${preview.questionCount} câu` : 'Xác nhận nhập'}
          </Button>
        </div>
      </div>

      <AppDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        busy={isLoading}
        title={`Nhập ${preview.questionCount} câu vào ngân hàng?`}
        description="Mọi nhóm, câu và tệp media được ghi trong một lần: có lỗi thì không câu nào được nhập."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => setDialogOpen(false)}
              className="h-10 rounded-xl px-4 font-semibold"
            >
              Quay lại kiểm tra
            </Button>
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => void submit()}
              className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold shadow-md shadow-primary/30"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Upload />}
              {isLoading ? 'Đang nhập…' : 'Nhập ngay'}
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-accent/70 p-3 sm:grid-cols-4">
          {[
            { label: 'Nhóm', value: preview.groupCount },
            { label: 'Câu hỏi', value: preview.questionCount },
            { label: 'Media', value: `${preview.mediaCount} tệp` },
            { label: 'Trạng thái', value: STATUS_META[status].label },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white px-3 py-2 text-center">
              <dt className="text-xs text-subtle">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-bold whitespace-nowrap text-brand">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        {status === 'ACTIVE' && (
          <p className="mt-3 text-xs text-muted-foreground">
            Câu ở trạng thái Đang dùng thêm được ngay vào đề để xuất bản.
          </p>
        )}
        {confirmError && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-on-danger-soft"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            {confirmError}
          </p>
        )}
      </AppDialog>
    </div>
  );
}

function StatusBanner({
  canConfirm,
  errorCount,
  warningCount,
  changed,
  actions,
}: {
  canConfirm: boolean;
  errorCount: number;
  warningCount: number;
  changed: boolean;
  actions: ReactNode;
}) {
  const ok = canConfirm;
  const Icon = ok ? CircleCheck : CircleX;
  const title = ok
    ? 'Tệp hợp lệ, sẵn sàng nhập'
    : changed
      ? 'Ngân hàng câu hỏi đã thay đổi từ lúc xem trước'
      : `Tệp còn ${errorCount} lỗi, chưa thể nhập`;
  const text = ok
    ? warningCount > 0
      ? `Không có lỗi. Có ${warningCount} cảnh báo, bạn vẫn có thể nhập.`
      : 'Không có lỗi hay cảnh báo nào.'
    : changed
      ? `Lúc xác nhận, hệ thống kiểm tra lại và thấy ${errorCount} lỗi mới (thường là mã câu vừa có người nhập). Sửa tệp rồi tải lên lại.`
      : 'Sửa các ô bị lỗi trong Excel rồi tải tệp lên lại. Cảnh báo không chặn việc nhập.';

  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={cn(
        'flex flex-col gap-4 rounded-3xl border px-5 py-4 lg:flex-row lg:items-center',
        ok ? 'border-success/25 bg-success-soft/25' : 'border-destructive/20 bg-danger-soft',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className={cn('mt-0.5 size-6 shrink-0', ok ? 'text-success' : 'text-destructive')} />
        <div>
          <p className={cn('font-bold', ok ? 'text-success' : 'text-destructive')}>{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}

function Stat({
  label,
  tone,
  wide,
  children,
}: {
  label: string;
  tone?: 'error' | 'warning';
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-border bg-white px-4 py-3 shadow-2xs',
        wide && 'col-span-2 sm:col-span-3 xl:col-span-1',
      )}
    >
      <dt className="text-xs font-semibold text-subtle">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-2xl font-bold text-foreground tabular-nums',
          wide && 'text-base',
          tone === 'error' && 'text-destructive',
          tone === 'warning' && 'text-amber-600',
        )}
      >
        {children}
      </dd>
    </div>
  );
}
