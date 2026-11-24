import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PASSAGE_BLANK } from '../blanks';

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

/**
 * Đoạn văn, bảng thông tin: giữ xuống dòng và khoảng trắng như lúc nhập.
 * Có `blanks` (Reading Part 6) thì dấu [n] hiện thành ô ghi số câu của đề.
 */
export function PassageView({
  text,
  blanks,
  className,
}: {
  text: string;
  blanks?: Map<number, number>;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-slate-700',
        className,
      )}
    >
      {blanks?.size ? renderBlanks(text, blanks) : text}
    </p>
  );
}

function renderBlanks(text: string, blanks: Map<number, number>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(PASSAGE_BLANK)) {
    const number = blanks.get(Number(match[1]));
    if (number === undefined) continue; // [n] không ứng với câu nào: giữ nguyên văn bản
    nodes.push(text.slice(cursor, match.index));
    nodes.push(
      <span
        key={match.index}
        className="mx-0.5 inline-block min-w-14 rounded-md border-b-2 border-primary bg-primary/10 px-2 text-center font-bold text-brand tabular-nums"
      >
        {number}
      </span>,
    );
    cursor = match.index + match[0].length;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}
