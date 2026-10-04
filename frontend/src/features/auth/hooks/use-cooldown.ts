import { useEffect, useState } from 'react';

// Backend cho gửi tối đa 3 email / 15 phút; chờ 60 giây giữa hai lần bấm để không phí lượt
export const RESEND_COOLDOWN_SECONDS = 60;

export function useCooldown(initialSeconds = 0) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return { remaining, start: setRemaining };
}
