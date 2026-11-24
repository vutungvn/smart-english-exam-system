import { Headphones, ImageIcon } from 'lucide-react';
import { MediaAudio } from '@/components/media/MediaAudio';
import { cn } from '@/lib/utils';

interface QuestionMediaProps {
  kind: 'audio' | 'image';
  /** audioUrl/imageUrl backend trả về (URL ký, còn hạn vài giờ); null khi chưa có tệp */
  url: string | null | undefined;
  label?: string;
  /** Dòng phụ khi chưa có tệp */
  emptyHint?: string;
  /**
   * Bấm ảnh mở ảnh cỡ gốc ở tab mới (mặc định, cho giáo viên soạn đề). Trang làm bài, xem lại của học
   * viên tắt đi để bấm nhầm không rời khỏi bài
   */
  openable?: boolean;
  className?: string;
}

/**
 * Ảnh, audio của câu hỏi/nhóm câu. Audio phát qua MediaAudio (tải bằng fetch rồi phát từ blob:,
 * tránh trình quản lý tải xuống như IDM bắt tệp .mp3).
 * Chưa có tệp thì hiện ô gạch đứt để giáo viên biết Part này cần tệp.
 */
export function QuestionMedia({
  kind,
  url,
  label,
  emptyHint,
  openable = true,
  className,
}: QuestionMediaProps) {
  const Icon = kind === 'audio' ? Headphones : ImageIcon;
  const title = label ?? (kind === 'audio' ? 'Âm thanh' : 'Hình ảnh');

  if (!url) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-dashed border-border bg-slate-50 px-4 py-3',
          className,
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-subtle">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-700">{title}</span>
          <span className="block text-xs text-subtle">{emptyHint ?? 'Chưa có tệp'}</span>
        </span>
      </div>
    );
  }

  return (
    <figure className={cn('rounded-2xl border border-border bg-white p-3', className)}>
      <figcaption className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon className="size-4 text-primary" />
        {title}
      </figcaption>
      {kind === 'audio' ? (
        <MediaAudio url={url} />
      ) : openable ? (
        <a href={url} target="_blank" rel="noreferrer" title="Mở ảnh cỡ gốc">
          <QuestionImage url={url} alt={title} />
        </a>
      ) : (
        // Không kéo thả được: kéo ảnh ra thanh tab cũng mở tab mới
        <QuestionImage url={url} alt={title} draggable={false} />
      )}
    </figure>
  );
}

function QuestionImage({ url, alt, draggable }: { url: string; alt: string; draggable?: boolean }) {
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      draggable={draggable}
      className="max-h-72 w-full rounded-xl bg-slate-50 object-contain"
    />
  );
}
