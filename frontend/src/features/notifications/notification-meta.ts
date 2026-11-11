import type { NotificationItem, RoleCode } from '@/api/generated';
import { attemptResultPath, attemptReviewPath } from '@/features/practice/practice-meta';

/** Sự kiện Socket.IO namespace /notifications (khớp NOTIFICATION_EVENT ở backend) */
export const NOTIFICATION_EVENT = 'notification';

/** Số thông báo hiện trong chuông; xem hết ở trang riêng khi cần (chưa làm) */
export const BELL_PAGE_SIZE = 10;

/** Trang liên quan của thông báo; null khi không dẫn đi đâu */
export function notificationLink(
  item: NotificationItem,
  role: RoleCode | undefined,
): string | null {
  const attemptId = item.data?.attemptId;
  // Trang kết quả, xem lại bài làm chỉ có ở khu vực học viên
  if (!attemptId || role !== 'STUDENT') return null;
  // Câu chấm lỗi: nút "Chấm lại" nằm ở trang xem lại
  return item.type === 'GRADING_FAILED'
    ? attemptReviewPath(attemptId)
    : attemptResultPath(attemptId);
}

const relative = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

/** "vừa xong", "5 phút trước", "hôm qua"; quá 7 ngày thì ghi ngày */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (seconds > -60) return 'vừa xong';
  const minutes = Math.round(seconds / 60);
  if (minutes > -60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours > -24) return relative.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (days >= -7) return relative.format(days, 'day');
  return new Date(iso).toLocaleDateString('vi-VN');
}
