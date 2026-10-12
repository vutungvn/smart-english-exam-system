import { cn } from '@/lib/utils';

// Dòng thoại "M: ...", "W2: ..." theo cách viết transcript TOEIC (M: nam, W: nữ)
const SPEAKER_LINE = /^\s*([MW])(\d?)\s*:\s*(.*)$/;

const SPEAKER_STYLE = {
  M: { label: 'Nam', badge: 'bg-primary/10 text-brand' },
  W: { label: 'Nữ', badge: 'bg-rose-50 text-rose-600' },
} as const;

/**
 * Lời thoại: dòng bắt đầu bằng M:/W: hiện chấm tròn người nói, dòng khác giữ nguyên văn bản.
 * Không tự đặt tên người nói (dữ liệu chỉ là văn bản thường).
 */
export function TranscriptView({ text, className }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  return (
    <div className={cn('space-y-3 text-sm leading-relaxed text-slate-700', className)}>
      {lines.map((line, index) => {
        const match = SPEAKER_LINE.exec(line);
        if (!match) {
          return (
            <p key={index} className="wrap-break-word whitespace-pre-wrap">
              {line}
            </p>
          );
        }
        const [, letter, number, speech] = match;
        const style = SPEAKER_STYLE[letter as 'M' | 'W'];
        return (
          <div key={index} className="flex gap-3">
            <span
              title={`${style.label}${number ? ` ${number}` : ''}`}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                style.badge,
              )}
            >
              {letter}
              {number}
            </span>
            <p className="min-w-0 pt-0.5 wrap-break-word">{speech}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Đoạn văn, bảng thông tin: giữ xuống dòng và khoảng trắng như lúc nhập */
export function PassageView({ text, className }: { text: string; className?: string }) {
  return (
    <p
      className={cn(
        'text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-slate-700',
        className,
      )}
    >
      {text}
    </p>
  );
}
