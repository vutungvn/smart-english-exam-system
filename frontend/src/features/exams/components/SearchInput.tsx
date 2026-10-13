import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  /** Giá trị đang áp dụng (trên URL hoặc state của nơi gọi) */
  value?: string;
  onSearch: (q: string | undefined) => void;
  placeholder: string;
  className?: string;
}

/**
 * Gõ tới đâu hiện tới đó nhưng chỉ báo ra ngoài sau 400 ms ngừng gõ, để không gọi API theo từng phím.
 * Giá trị bị đổi từ nơi khác (nút Xóa bộ lọc, Back) thì ô nhập cập nhật theo.
 */
export function SearchInput({ value, onSearch, placeholder, className }: SearchInputProps) {
  const [text, setText] = useState(value ?? '');
  const [synced, setSynced] = useState(value);

  if (value !== synced) {
    setSynced(value);
    if (text.trim() !== (value ?? '')) setText(value ?? '');
  }

  useEffect(() => {
    const next = text.trim();
    if (next === (value ?? '')) return;
    const timer = setTimeout(() => onSearch(next || undefined), 400);
    return () => clearTimeout(timer);
  }, [text, value, onSearch]);

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={text}
        maxLength={200}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, '')}
        className="h-10 w-full rounded-xl border border-border bg-white pr-9 pl-10 text-sm outline-none transition-colors placeholder:text-subtle hover:border-slate-300 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Xóa từ khóa"
          onClick={() => setText('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-subtle hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
