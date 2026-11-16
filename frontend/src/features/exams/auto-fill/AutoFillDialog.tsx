import { useMemo, useState } from 'react';
import { ArrowLeft, Dices, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useApplyAutoFillMutation,
  useGetAutoFillCoverageQuery,
  usePreviewAutoFillMutation,
  type AutoFillPreview,
  type AutoFillScope,
  type ExamDetail,
} from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/features/question-bank/components/ListStates';
import { ToggleSwitch } from '@/features/question-bank/components/FilterControls';
import { inputClass } from '@/features/question-bank/form/styles';
import { cn } from '@/lib/utils';
import {
  configError,
  DEFAULT_RATIO,
  initialConfig,
  partKey,
  toApplyBody,
  toPreviewParts,
  type PartConfig,
} from './auto-fill-form';
import { MatrixEditor } from './MatrixEditor';
import { PreviewParts } from './PreviewParts';

interface AutoFillDialogProps {
  exam: ExamDetail;
  onClose: () => void;
  /** Áp dụng xong: đóng hộp thoại, báo thành công */
  onApplied: (message: string) => void;
  /** Đề đổi ở nơi khác (409): tải lại đề để lấy updatedAt mới */
  onStale: () => void;
}

const primaryButton = 'h-10 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold';

/**
 * Rút đề tự động (SPRINT-50): bước 1 đặt ma trận (số lượng, độ khó, chủ đề) cạnh số câu ngân hàng
 * đang có; bước 2 xem trước (không ghi gì), rút lại với seed khác, áp dụng đúng các câu đã xem
 */
export function AutoFillDialog({ exam, onClose, onApplied, onStale }: AutoFillDialogProps) {
  const coverageQuery = useGetAutoFillCoverageQuery(exam.id, { refetchOnMountOrArgChange: true });
  const coverage = coverageQuery.data?.data;
  const [previewAutoFill, previewState] = usePreviewAutoFillMutation();
  const [applyAutoFill, applyState] = useApplyAutoFillMutation();

  const [scope, setScope] = useState<AutoFillScope>('EMPTY_PARTS');
  const [preferUnused, setPreferUnused] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, PartConfig>>({});
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [preview, setPreview] = useState<AutoFillPreview>();
  const [confirmAll, setConfirmAll] = useState(false);
  const [error, setError] = useState<string>();

  const scale = exam.scoringScale;
  const parts = useMemo(() => coverage?.parts ?? [], [coverage]);
  // Cấu hình hiện tại = mặc định của từng Part + những gì giáo viên đã sửa
  const configs = useMemo(
    () =>
      Object.fromEntries(
        parts.map((part) => [
          partKey(part),
          overrides[partKey(part)] ?? initialConfig(part, scale),
        ]),
      ),
    [parts, overrides, scale],
  );
  const busy = previewState.isLoading || applyState.isLoading;

  const update = (key: string, patch: Partial<PartConfig>) => {
    setOverrides((prev) => ({ ...prev, [key]: { ...configs[key], ...patch } }));
    setPreview(undefined);
  };

  const applyRatioToAll = () =>
    setOverrides(
      Object.fromEntries(
        parts.map((part) => [partKey(part), { ...configs[partKey(part)], ...ratio }]),
      ),
    );

  const runPreview = async (seed?: string) => {
    setError(undefined);
    setConfirmAll(false);
    const invalid = parts.find((part) => {
      const kept = scope === 'EMPTY_PARTS' && part.current > 0;
      return !kept && configError(part, configs[partKey(part)], scale);
    });
    if (invalid) {
      setError('Ma trận còn lỗi, xem dòng báo đỏ ở Part tương ứng');
      return;
    }
    const body = toPreviewParts(parts, configs, scale);
    if (body.length === 0) {
      setError('Chọn ít nhất một Part để rút');
      return;
    }
    try {
      const result = await previewAutoFill({
        id: exam.id,
        autoFillPreviewDto: { scope, preferUnused, parts: body, seed },
      }).unwrap();
      setPreview(result.data);
    } catch (cause) {
      const apiError = toApiError(cause);
      setError(apiError.fieldErrors[0]?.message ?? apiError.message);
    }
  };

  const apply = async () => {
    if (!preview) return;
    if (preview.scope === 'ALL' && !confirmAll) {
      setConfirmAll(true);
      return;
    }
    setError(undefined);
    try {
      await applyAutoFill({
        id: exam.id,
        autoFillApplyDto: toApplyBody(preview, exam.updatedAt),
      }).unwrap();
      onApplied(`Đã rút đề tự động: đề có ${preview.totalQuestions} câu`);
    } catch (cause) {
      const apiError = toApiError(cause);
      setError(
        apiError.code === 'VERSION_CONFLICT'
          ? 'Đề vừa thay đổi ở nơi khác. Hãy xem trước lại rồi áp dụng.'
          : (apiError.fieldErrors[0]?.message ?? apiError.message),
      );
      if (apiError.code === 'VERSION_CONFLICT' || apiError.code === 'VALIDATION_ERROR') {
        setPreview(undefined);
        onStale();
      }
    }
  };

  const footer = preview ? (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        onClick={() => setPreview(undefined)}
        className="h-10 rounded-xl px-4"
      >
        <ArrowLeft />
        Sửa ma trận
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => void runPreview()}
        className="h-10 rounded-xl px-4"
      >
        {previewState.isLoading ? <Loader2 className="animate-spin" /> : <Dices />}
        Rút lại
      </Button>
      <Button type="button" disabled={busy} onClick={() => void apply()} className={primaryButton}>
        {applyState.isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {confirmAll ? 'Xác nhận thay toàn bộ' : 'Áp dụng'}
      </Button>
    </>
  ) : (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        onClick={onClose}
        className="h-10 rounded-xl px-4"
      >
        Hủy
      </Button>
      <Button
        type="button"
        disabled={busy || !coverage}
        onClick={() => void runPreview()}
        className={primaryButton}
      >
        {previewState.isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
        Xem trước
      </Button>
    </>
  );

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      busy={busy}
      title="Rút đề tự động"
      description={
        preview
          ? 'Kiểm tra kết quả, chưa có gì được ghi vào đề. Bấm "Rút lại" để thử bộ câu khác.'
          : 'Đặt ma trận số lượng, độ khó, chủ đề cho từng Part; hệ thống chọn câu từ ngân hàng.'
      }
      footer={footer}
    >
      <div className="space-y-4">
        {error && <FormAlert message={error} onClose={() => setError(undefined)} />}
        {confirmAll && (
          <FormAlert message="Rút lại cả đề sẽ xóa toàn bộ câu đang có trong đề rồi ghi các câu vừa xem trước. Bấm “Xác nhận thay toàn bộ” để tiếp tục." />
        )}

        {coverageQuery.isLoading ? (
          <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang đọc ngân hàng câu hỏi…
          </p>
        ) : !coverage ? (
          <ErrorState
            message={toApiError(coverageQuery.error).message}
            onRetry={() => void coverageQuery.refetch()}
          />
        ) : preview ? (
          <PreviewParts preview={preview} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <fieldset className="rounded-2xl border border-border p-3">
                <legend className="px-1 text-xs font-semibold text-slate-700">Phạm vi</legend>
                {(
                  [
                    ['EMPTY_PARTS', 'Chỉ các Part còn trống', 'Part đã có câu giữ nguyên'],
                    ['ALL', 'Rút lại cả đề', 'Xóa toàn bộ câu đang có rồi rút lại'],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className="flex cursor-pointer items-start gap-2 py-1 text-sm">
                    <input
                      type="radio"
                      name="auto-fill-scope"
                      checked={scope === value}
                      onChange={() => {
                        setScope(value);
                        setPreview(undefined);
                      }}
                      className="mt-1 accent-primary"
                    />
                    <span>
                      <span className="font-semibold text-foreground">{label}</span>
                      <span className="block text-xs text-subtle">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <div className="space-y-3 rounded-2xl border border-border p-3">
                <ToggleSwitch
                  label="Ưu tiên câu chưa dùng ở đề khác"
                  checked={preferUnused}
                  onChange={setPreferUnused}
                />
                <div className="flex flex-wrap items-end gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <label key={level} className="text-xs font-semibold text-slate-700">
                      {{ easy: 'Dễ %', medium: 'Vừa %', hard: 'Khó %' }[level]}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ratio[level]}
                        onChange={(event) => setRatio({ ...ratio, [level]: event.target.value })}
                        className={cn(inputClass, 'mt-1 block h-9 w-16 px-2 text-center')}
                      />
                    </label>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyRatioToAll}
                    className="h-9 rounded-xl px-3 text-xs"
                  >
                    Áp cho mọi Part
                  </Button>
                </div>
              </div>
            </div>

            {parts.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
                Loại đề này chưa có Part nào để rút.
              </p>
            ) : (
              <MatrixEditor
                parts={parts}
                configs={configs}
                scale={scale}
                scope={scope}
                onChange={update}
              />
            )}
          </>
        )}
      </div>
    </AppDialog>
  );
}
