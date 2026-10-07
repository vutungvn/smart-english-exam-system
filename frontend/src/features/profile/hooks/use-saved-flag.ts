import { useEffect, useState } from 'react';

// Cờ "Đã lưu" tự tắt sau vài giây, dùng cho dòng xác nhận cạnh nút Lưu
export function useSavedFlag(durationMs = 3000) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), durationMs);
    return () => clearTimeout(timer);
  }, [saved, durationMs]);

  return { saved, markSaved: () => setSaved(true), clearSaved: () => setSaved(false) };
}
