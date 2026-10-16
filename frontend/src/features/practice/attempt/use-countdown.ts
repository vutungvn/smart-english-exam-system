import { useEffect, useState } from 'react';

/**
 * Đếm ngược tới deadline (mốc theo đồng hồ máy học viên, đã quy từ số giây còn lại server trả về
 * nên không lệch dù đồng hồ máy chạy sai giờ). null: không đếm giờ. Trả số giây còn lại.
 */
export function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [deadline]);

  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
