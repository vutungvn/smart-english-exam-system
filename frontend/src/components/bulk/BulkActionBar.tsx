import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionBarProps {
  count: number;
  /** "câu hỏi", "nhóm", "đề" */
  noun: string;
  onClear: () => void;
  onDelete: () => void;
}

/** Thanh nổi ở đáy màn hình khi đang chọn ít nhất một mục */
export function BulkActionBar({ count, noun, onClear, onDelete }: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Thao tác với mục đã chọn"
      className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur"
    >
      <p className="text-sm font-semibold text-foreground">
        Đã chọn <span className="text-brand tabular-nums">{count}</span> {noun}
      </p>
      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        className="h-9 rounded-xl px-3 text-slate-600"
      >
        <X />
        Bỏ chọn
      </Button>
      <Button
        type="button"
        onClick={onDelete}
        className="ml-auto h-10 rounded-xl bg-destructive px-4 font-semibold text-white hover:bg-destructive/90"
      >
        <Trash2 />
        Xóa đã chọn ({count})
      </Button>
    </div>
  );
}
