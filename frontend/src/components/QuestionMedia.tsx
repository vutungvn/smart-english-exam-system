import { Headphones, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionMediaProps {
  kind: 'audio' | 'image';
  /** audioUrl/imageUrl backend trả về (URL ký, còn hạn vài giờ); null khi chưa có tệp */
  url: string | null | undefined;
  label?: string;
  /** Dòng phụ khi chưa có tệp */
  emptyHint?: string;
  className?: string;
}

/**
 * Ảnh, audio của câu hỏi/nhóm câu. Thẻ <audio> tự gửi header Range khi tua, backend trả 206.
 * Chưa có tệp thì hiện ô gạch đứt để giáo viên biết Part này cần tệp.
 */
export function QuestionMedia({ kind, url, label, emptyHint, className }: QuestionMediaProps) {
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
        <audio controls preload="metadata" src={url} className="w-full">
          Trình duyệt không phát được âm thanh.
        </audio>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" title="Mở ảnh cỡ gốc">
          <img
            src={url}
            alt={title}
            loading="lazy"
            className="max-h-72 w-full rounded-xl bg-slate-50 object-contain"
          />
        </a>
      )}
    </figure>
  );
}
