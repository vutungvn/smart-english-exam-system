import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Vùng không sửa được khi câu, nhóm đang được làm bài (D29). Dùng `inert` thay cho `disabled`:
 * không bấm, gõ, focus được nhưng giá trị vẫn nằm trong form (React Hook Form bỏ giá trị của ô
 * disabled khi lưu, form sẽ gửi thiếu nội dung câu)
 */
export function LockedArea({
  locked,
  className,
  children,
}: {
  locked: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      inert={locked}
      aria-disabled={locked || undefined}
      className={cn(locked && 'opacity-60 select-text', className)}
    >
      {children}
    </div>
  );
}
