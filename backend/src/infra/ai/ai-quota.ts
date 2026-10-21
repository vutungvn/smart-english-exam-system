import type { AiFeature } from '../../generated/prisma/enums.js';

// Hạn mức theo ngày của Gemini làm mới lúc 0h giờ Thái Bình Dương; bộ đếm của hệ thống dùng cùng mốc
const PACIFIC_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Ngày theo giờ Thái Bình Dương, dạng "2026-10-21" */
export function pacificDay(date: Date): string {
  return PACIFIC_DATE.format(date);
}

/** Lúc sang ngày mới theo giờ Thái Bình Dương: 14h giờ VN khi Mỹ dùng giờ mùa hè, 15h khi không */
export function nextPacificMidnight(now: Date): Date {
  const today = pacificDay(now);
  // Lệch giờ là -7 hoặc -8 giờ chẵn nên 0h luôn rơi vào đầu một giờ UTC: dò từng giờ là đủ
  const candidate = new Date(now);
  candidate.setUTCMinutes(0, 0, 0);
  do {
    candidate.setUTCHours(candidate.getUTCHours() + 1);
  } while (pacificDay(candidate) === today);
  return candidate;
}

/** "14:00" theo giờ Việt Nam */
export function formatVietnamTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Tổng lượt gọi AI trong ngày của cả hệ thống */
export const budgetKey = (day: string): string => `ai:budget:${day}`;

/** Lượt của một người dùng cho một tính năng trong ngày */
export const userQuotaKey = (feature: AiFeature, userId: string, day: string): string =>
  `ai:quota:${feature}:${userId}:${day}`;
