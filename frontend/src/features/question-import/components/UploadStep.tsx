import { useId, useRef, useState, type DragEvent } from 'react';
import {
  ArrowRight,
  CircleAlert,
  Clock,
  CloudUpload,
  Download,
  FileArchive,
  FileSpreadsheet,
  FolderOpen,
  Hash,
  Layers,
  Loader2,
  Music,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import { usePreviewQuestionImportMutation, type ImportPreview } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFileDownload } from '../hooks/use-file-download';
import { checkZipFile, formatBytes, IMPORT_LIMITS } from '../import-meta';
import { CardTitle, ImportCard } from './ImportCard';

interface UploadStepProps {
  /** Thông báo mang từ bước sau quay về (phiên hết hạn, ngân hàng đã đổi…) */
  notice?: string;
  onPreviewed: (preview: ImportPreview) => void;
}

export function UploadStep({ notice, onPreviewed }: UploadStepProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>(notice);
  const [dragging, setDragging] = useState(false);
  const [preview, { isLoading }] = usePreviewQuestionImportMutation();

  const pick = (next: File | undefined) => {
    if (!next) return;
    const problem = checkZipFile(next);
    setError(problem ?? undefined);
    setFile(problem ? null : next);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!isLoading) pick(event.dataTransfer.files[0]);
  };

  const submit = async () => {
    if (!file) return;
    setError(undefined);
    try {
      const result = await preview({ file }).unwrap();
      onPreviewed(result.data);
    } catch (cause) {
      // Lỗi cả tệp: không phải zip, thiếu .xlsx, đường dẫn ../, bom giải nén, quá dung lượng…
      setError(toApiError(cause).message);
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <ImportCard className="lg:col-span-2">
        <CardTitle icon={CloudUpload} title="Chọn tệp nhập" />

        <div className="space-y-5 p-5 sm:p-6">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-danger-soft px-4 py-3"
            >
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-destructive">Không đọc được tệp</p>
                <p className="mt-0.5 text-sm text-on-danger-soft">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(undefined)}
                aria-label="Đóng thông báo"
                className="rounded-md p-1 text-destructive hover:bg-destructive/10"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="sr-only"
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = ''; // chọn lại đúng tệp cũ vẫn kích hoạt onChange
            }}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-12',
              dragging ? 'border-primary bg-accent' : 'border-primary/30 bg-slate-50/60',
            )}
          >
            <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-primary">
              <CloudUpload className="size-8" />
            </span>
            <p className="mt-4 font-semibold text-foreground">Kéo thả tệp .zip vào đây</p>
            <p className="mt-1 text-sm text-subtle">hoặc</p>
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => inputRef.current?.click()}
              className="mt-3 h-10 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold shadow-md shadow-primary/30"
            >
              <FolderOpen />
              Chọn tệp từ máy
            </Button>
            <p className="mt-4 rounded-full border border-border bg-white px-3 py-1 text-xs text-muted-foreground">
              Chỉ nhận tệp .zip, tối đa 100 MB
            </p>
          </div>

          {file && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-accent/60 px-4 py-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary">
                <FileArchive className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  Dung lượng: {formatBytes(file.size)}
                  {!isLoading && <span className="text-success"> · Sẵn sàng kiểm tra</span>}
                </p>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => inputRef.current?.click()}
                className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-white disabled:opacity-40 sm:inline-flex"
              >
                <RefreshCw className="size-4" />
                Đổi tệp
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setFile(null)}
                aria-label="Bỏ chọn tệp"
                className="rounded-lg p-1.5 text-subtle hover:bg-white hover:text-foreground disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs text-subtle">
              <ScanSearch className="mt-0.5 size-4 shrink-0" />
              Hệ thống chỉ kiểm tra và xem trước, chưa ghi gì vào ngân hàng cho tới khi bạn xác
              nhận.
            </p>
            <Button
              type="button"
              disabled={!file || isLoading}
              onClick={() => void submit()}
              className="h-11 shrink-0 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold shadow-md shadow-primary/30"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {isLoading ? 'Đang kiểm tra tệp…' : 'Tải lên & kiểm tra'}
            </Button>
          </div>
        </div>
      </ImportCard>

      <div className="space-y-6">
        <TemplateCard />
        <LimitsCard />
      </div>
    </div>
  );
}

function TemplateCard() {
  const { pending, error, downloadTemplate } = useFileDownload();

  return (
    <ImportCard>
      <CardTitle icon={FileSpreadsheet} title="Tệp mẫu" />
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Tệp mẫu có sẵn ví dụ đủ 4 kỹ năng và sheet hướng dẫn từng cột. Nhập nguyên tệp mẫu sẽ
          thành công.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={pending === 'template'}
          onClick={() => void downloadTemplate()}
          className="h-10 w-full rounded-xl bg-white font-semibold"
        >
          {pending === 'template' ? <Loader2 className="animate-spin" /> : <Download />}
          Tải tệp mẫu (.zip)
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}

        <pre className="overflow-x-auto rounded-2xl bg-slate-900 p-4 font-mono text-xs leading-6 text-slate-300">
          <span className="text-amber-300">cau-hoi.zip</span>
          {'\n├─ '}
          <span className="text-emerald-300">questions.xlsx</span>
          <span className="text-slate-500"> (sheet groups, questions)</span>
          {'\n└─ '}
          <span className="text-sky-300">media/</span>
          {'\n   ├─ P1-003.mp3\n   └─ W1-01-02.jpg'}
        </pre>
        <p className="text-xs text-subtle">
          Có thể nén cả thư mục chứa hai mục trên. Ô audio_file, image_file chỉ ghi tên tệp trong
          media/.
        </p>
      </div>
    </ImportCard>
  );
}

const LIMITS = [
  {
    icon: FileArchive,
    text: `Tệp .zip tối đa 100 MB, giải nén tối đa ${IMPORT_LIMITS.zipTotalMb} MB`,
  },
  {
    icon: Layers,
    text: `Tối đa ${IMPORT_LIMITS.questionRows} câu và ${IMPORT_LIMITS.groupRows} nhóm mỗi tệp`,
  },
  {
    icon: Music,
    text: `Audio MP3 ≤ ${IMPORT_LIMITS.audioMb} MB, ảnh JPG/PNG/WebP ≤ ${IMPORT_LIMITS.imageMb} MB`,
  },
  { icon: ScanSearch, text: 'Định dạng tệp kiểm tra theo nội dung, đổi đuôi tệp không qua được' },
  { icon: Hash, text: 'Mã câu (question_code) không trùng trong tệp và với câu đã có' },
  { icon: Clock, text: 'Bản xem trước giữ trong 1 giờ; tải tệp khác thì bản cũ bị hủy' },
];

function LimitsCard() {
  return (
    <ImportCard>
      <CardTitle icon={ShieldCheck} title="Giới hạn & lưu ý" />
      <ul className="space-y-3 p-5">
        {LIMITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <Icon className="size-3.5" />
            </span>
            <span className="pt-0.5">{text}</span>
          </li>
        ))}
      </ul>
    </ImportCard>
  );
}
