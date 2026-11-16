import { api } from '@/api/generated';
import { sessionCleared, sessionReceived } from '@/store/slice/auth-slice';
import { store } from '@/store/store';

/**
 * Mở app (hoặc F5) thì access token trong bộ nhớ đã mất: gọi /auth/refresh một lần, cookie
 * refresh token còn hạn thì lấy lại phiên. Gọi ở main.tsx trước khi render, không đặt trong
 * useEffect: StrictMode chạy effect 2 lần sẽ gửi refresh 2 lần song song, backend xoay vòng
 * refresh token nên coi lần thứ hai là dùng lại token và thu hồi cả phiên.
 */
export async function restoreSession(): Promise<void> {
  try {
    const { data: session } = await store.dispatch(api.endpoints.refresh.initiate()).unwrap();
    store.dispatch(sessionReceived(session));
  } catch {
    // Không có cookie, hết hạn, bị thu hồi hoặc không kết nối được server: coi là chưa đăng nhập
    store.dispatch(sessionCleared());
  }
}
