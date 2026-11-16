import { useEffect, useRef, useState } from 'react';
import type { MediaKind } from '@/lib/media-file';

export interface PendingFile {
  file: File;
  /** blob: URL để xem trước trước khi tải lên */
  previewUrl: string;
}

export type PendingMedia = Partial<Record<MediaKind, PendingFile>>;

/**
 * Tệp chọn khi đang TẠO câu hỏi: câu chưa có id nên chưa tải lên được, giữ ở đây tới khi lưu câu.
 * Thu hồi URL xem trước khi thay/bỏ tệp và khi rời trang.
 */
export function usePendingMedia() {
  const [pending, setPending] = useState<PendingMedia>({});
  const latest = useRef(pending);
  useEffect(() => {
    latest.current = pending;
  });
  useEffect(
    () => () => {
      for (const item of Object.values(latest.current)) URL.revokeObjectURL(item.previewUrl);
    },
    [],
  );

  const setFile = (kind: MediaKind, file: File | null) => {
    const old = pending[kind];
    if (old) URL.revokeObjectURL(old.previewUrl);
    const next = { ...pending };
    if (file) next[kind] = { file, previewUrl: URL.createObjectURL(file) };
    else delete next[kind];
    setPending(next);
  };

  const clear = () => {
    for (const item of Object.values(pending)) URL.revokeObjectURL(item.previewUrl);
    setPending({});
  };

  return { pending, setFile, clear };
}
