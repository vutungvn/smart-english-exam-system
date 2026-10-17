import { useEffect, useState } from 'react';
import { AudioLines, LoaderCircle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AudioPlayer } from './AudioPlayer';

/**
 * Tệp đã tải, dùng lại khi quay lại câu cũ (giới hạn số tệp để không giữ quá nhiều trong bộ nhớ).
 * Lưu Promise để nhiều trình phát cùng một tệp chỉ tải một lần.
 */
const CACHE_LIMIT = 40;
const cache = new Map<string, Promise<Blob>>();

function loadBlob(url: string): Promise<Blob> {
  const cached = cache.get(url);
  if (cached) return cached;
  const promise = fetch(url).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  });
  // Lỗi thì bỏ khỏi cache để bấm "Thử lại" tải lại thật
  promise.catch(() => cache.delete(url));
  cache.set(url, promise);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return promise;
}

interface Loaded {
  url: string;
  attempt: number;
  src?: string;
  failed?: boolean;
}

interface MediaAudioProps {
  /** audioUrl backend trả về (URL ký) hoặc blob: của tệp chờ tải lên */
  url: string;
  className?: string;
}

/**
 * Trình phát audio câu hỏi. Không gán thẳng URL tệp .mp3 cho thẻ <audio>: trình quản lý tải xuống
 * như IDM bắt request của thẻ media có đuôi .mp3 và bật hộp thoại tải tệp mỗi lần phát hoặc tua.
 * Thay vào đó tải tệp bằng fetch (IDM không can thiệp request do JavaScript gọi) rồi phát từ blob:
 * trong bộ nhớ. Tệp TOEIC nhỏ (50 KB – 1 MB) nên tải trọn trước khi phát gần như không thấy chậm,
 * và tua được ngay vì đã có toàn bộ dữ liệu.
 */
export function MediaAudio({ url, className }: MediaAudioProps) {
  const direct = url.startsWith('blob:');
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // Kết quả của URL/lần thử hiện tại; khác thì coi như đang tải (không setState đồng bộ trong effect)
  const current = loaded?.url === url && loaded.attempt === attempt ? loaded : null;

  useEffect(() => {
    if (direct) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    loadBlob(url).then(
      (blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ url, attempt, src: objectUrl });
      },
      () => {
        if (!cancelled) setLoaded({ url, attempt, failed: true });
      },
    );
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, attempt, direct]);

  const src = direct ? url : current?.src;

  // Trình phát tự làm, không có nút/menu tải xuống của trình duyệt (xem AudioPlayer)
  if (src) return <AudioPlayer src={src} className={className} />;

  const boxClass = cn(
    'flex h-13.5 w-full items-center gap-2.5 rounded-full bg-slate-100 px-4 text-sm',
    className,
  );

  if (current?.failed) {
    return (
      <div role="alert" className={cn(boxClass, 'bg-danger-soft/60 text-on-danger-soft')}>
        <AudioLines className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Không tải được âm thanh</span>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-white/70"
        >
          <RotateCw className="size-3.5" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div aria-busy className={cn(boxClass, 'text-muted-foreground')}>
      <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
      Đang tải âm thanh…
    </div>
  );
}
