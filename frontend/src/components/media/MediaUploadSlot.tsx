import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  CircleAlert,
  Clock,
  Headphones,
  ImageIcon,
  LoaderCircle,
  Trash2,
  Upload,
} from 'lucide-react';
import { MediaAudio } from '@/components/media/MediaAudio';
import { Button } from '@/components/ui/button';
import {
  describeMediaError,
  MEDIA_ACCEPT,
  MEDIA_FORMAT_HINT,
  validateMediaFile,
  type MediaKind,
} from '@/lib/media-file';
import { cn } from '@/lib/utils';

interface MediaUploadSlotProps {
  kind: MediaKind;
  label?: string;
  /** URL đang hiện: tệp đã lưu (URL ký của backend) hoặc tệp chờ tải lên (blob: xem trước) */
  url: string | null | undefined;
  /** Tên tệp chờ tải lên: có thì hiện ghi chú "tải lên khi lưu" */
  pendingName?: string;
  optional?: boolean;
  /** Dùng trong câu hỏi xác nhận gỡ tệp: "Gỡ âm thanh khỏi {owner}?" */
  owner?: string;
  disabled?: boolean;
  /** Tệp đã qua kiểm tra loại, dung lượng. Trả Promise thì ô hiện "Đang tải lên…" tới khi xong */
  onSelect: (file: File) => Promise<unknown> | void;
  onRemove: () => Promise<unknown> | void;
}

/**
 * Ô tải audio/ảnh: kéo thả hoặc bấm chọn tệp, xem trước, thay tệp, gỡ tệp.
 * Lỗi (sai loại, quá lớn, server từ chối) hiện ngay dưới ô.
 */
export function MediaUploadSlot({
  kind,
  label,
  url,
  pendingName,
  optional,
  owner = 'câu hỏi',
  disabled,
  onSelect,
  onRemove,
}: MediaUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const Icon = kind === 'audio' ? Headphones : ImageIcon;
  const title = label ?? (kind === 'audio' ? 'Âm thanh' : 'Hình ảnh');
  const locked = disabled || busy !== null;

  const run = async (action: 'upload' | 'remove', task: () => Promise<unknown> | void) => {
    setError('');
    setConfirmingRemove(false);
    setBusy(action);
    try {
      await task();
    } catch (cause) {
      setError(describeMediaError(cause));
    } finally {
      setBusy(null);
    }
  };

  const pick = (file: File | undefined) => {
    if (!file || locked) return;
    const problem = validateMediaFile(kind, file);
    if (problem) return setError(problem);
    void run('upload', () => onSelect(file));
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Xóa giá trị để chọn lại đúng tệp vừa chọn vẫn kích hoạt onChange
    event.target.value = '';
    pick(file);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files[0]);
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (!locked) setDragging(true);
  };

  return (
    <div
      role="group"
      aria-label={title}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'relative min-w-0 rounded-2xl border bg-white p-3 transition-colors',
        dragging ? 'border-primary bg-accent' : 'border-border',
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {optional && <span className="text-xs text-subtle">(không bắt buộc)</span>}
        {url && !confirmingRemove && (
          <span className="ml-auto flex gap-1">
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-lg px-2.5 text-xs"
              disabled={locked}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Thay tệp
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Gỡ ${title.toLowerCase()}`}
              className="h-8 rounded-lg px-2 text-subtle hover:bg-danger-soft hover:text-destructive"
              disabled={locked}
              // Tệp chờ tải lên thì bỏ luôn; tệp đã lưu thì hỏi lại trước khi gỡ
              onClick={() =>
                pendingName ? void run('remove', onRemove) : setConfirmingRemove(true)
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </span>
        )}
      </div>

      {confirmingRemove && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-danger-soft/60 px-3 py-2 text-xs text-on-danger-soft">
          <span className="mr-auto">
            Gỡ {title.toLowerCase()} khỏi {owner}?
          </span>
          <Button
            type="button"
            variant="ghost"
            className="h-7 rounded-lg px-2 text-xs"
            onClick={() => setConfirmingRemove(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-7 rounded-lg px-2.5 text-xs"
            onClick={() => void run('remove', onRemove)}
          >
            Gỡ tệp
          </Button>
        </div>
      )}

      {url ? (
        kind === 'audio' ? (
          <MediaAudio url={url} />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" title="Mở ảnh cỡ gốc">
            <img
              src={url}
              alt={title}
              className="max-h-64 w-full rounded-xl bg-slate-50 object-contain"
            />
          </a>
        )
      ) : (
        <button
          type="button"
          disabled={locked}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
            'border-slate-300 bg-slate-50 hover:border-primary hover:bg-accent disabled:pointer-events-none disabled:opacity-60',
          )}
        >
          <Upload className="size-5 text-primary" />
          <span className="text-sm font-semibold text-slate-700">Kéo thả hoặc bấm để chọn tệp</span>
          <span className="text-xs text-subtle">{MEDIA_FORMAT_HINT[kind]}</span>
        </button>
      )}

      {pendingName && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
          <Clock className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-all">
            {pendingName} · tải lên khi lưu {owner}
          </span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {busy && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-white/80 text-sm font-medium text-slate-700">
          <LoaderCircle className="size-4 animate-spin text-primary" />
          {busy === 'upload' ? 'Đang tải lên…' : 'Đang gỡ…'}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_ACCEPT[kind]}
        onChange={onChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
