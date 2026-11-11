import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { api, type NotificationItem } from '@/api/generated';
import { useAppDispatch, useAppSelector } from '@/hooks/hooks';
import { selectAccessToken, selectCurrentUser } from '@/store/slice/auth-slice';
import { NOTIFICATION_EVENT, notificationLink } from './notification-meta';

/** Chờ một chút sau khi bị ngắt vì hết hạn token rồi mới gọi API (để chắc chắn token đã hết hạn) */
const REAUTH_DELAY_MS = 1000;

/**
 * Kết nối Socket.IO namespace /notifications bằng access token đang giữ trong bộ nhớ (SPRINT-56):
 * có thông báo mới thì hiện toast và làm mới dữ liệu liên quan (chuông, kết quả bài làm, tiến độ).
 * Token đổi (làm mới, đăng xuất) thì đóng kết nối cũ, mở kết nối mới. Server từ chối hoặc ngắt vì
 * token hết hạn: gọi một API nhẹ để base-api tự làm mới token, token mới làm effect chạy lại.
 * Không vẽ gì, đặt trong khung trang sau đăng nhập (AppShell)
 */
export function NotificationListener() {
  const token = useAppSelector(selectAccessToken);
  const role = useAppSelector(selectCurrentUser)?.role;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    // Vite proxy /socket.io (ws) → backend; chỉ dùng WebSocket, không long-polling
    const socket = io('/notifications', { auth: { token }, transports: ['websocket'] });
    let reauthTimer: ReturnType<typeof setTimeout> | undefined;
    let connectedBefore = false;

    const reauth = () => {
      clearTimeout(reauthTimer);
      reauthTimer = setTimeout(() => {
        void dispatch(
          api.endpoints.getUnreadNotificationCount.initiate(undefined, {
            forceRefetch: true,
            subscribe: false,
          }),
        );
      }, REAUTH_DELAY_MS);
    };

    socket.on('connect', () => {
      // Kết nối lại sau khi rớt mạng: có thể đã lỡ thông báo trong lúc mất kết nối
      if (connectedBefore) dispatch(api.util.invalidateTags(['Notifications']));
      connectedBefore = true;
    });
    socket.on('connect_error', (error) => {
      if (error.message === 'UNAUTHORIZED') reauth();
    });
    socket.on('disconnect', (reason) => {
      // Server chủ động ngắt: access token hết hạn
      if (reason === 'io server disconnect') reauth();
    });
    socket.on(NOTIFICATION_EVENT, (item: NotificationItem) => {
      dispatch(
        api.util.invalidateTags(
          item.data?.attemptId
            ? ['Notifications', 'Attempts', 'Progress', 'Exam Catalog']
            : ['Notifications'],
        ),
      );
      const link = notificationLink(item, role);
      const show = item.type === 'GRADING_FAILED' ? toast.warning : toast.success;
      show(item.title, {
        description: item.message,
        duration: 8000,
        action: link ? { label: 'Xem', onClick: () => void navigate(link) } : undefined,
      });
    });

    return () => {
      clearTimeout(reauthTimer);
      socket.disconnect();
    };
  }, [token, role, dispatch, navigate]);

  return null;
}
