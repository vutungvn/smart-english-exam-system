import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { TokenService } from '../auth/token.service.js';
import { NOTIFICATION_EVENT, type NotificationItem } from './notifications.types.js';

/** setTimeout chỉ nhận tối đa 2^31 - 1 ms (khoảng 24,8 ngày) */
const MAX_TIMER_MS = 2_147_483_647;

/** Máy khách chỉ nhận, không gửi sự kiện nào lên */
type ClientToServerEvents = Record<string, never>;
interface ServerToClientEvents {
  [NOTIFICATION_EVENT]: (item: NotificationItem) => void;
}
interface SocketData {
  userId: string;
  expiresAt: Date | null;
  expiryTimer?: NodeJS.Timeout;
}
type NotificationSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
type NotificationNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

const userRoom = (userId: string): string => `user:${userId}`;

/**
 * Socket.IO namespace /notifications (SPRINT-56): trình duyệt kết nối kèm access token
 * (`auth: { token }`), mỗi người dùng một room nên mở nhiều tab đều nhận. Token sai hoặc hết hạn thì
 * từ chối kết nối (connect_error "UNAUTHORIZED"); kết nối đang mở bị ngắt khi token hết hạn, máy
 * khách làm mới token rồi kết nối lại. Chỉ phát thông báo, không nhận sự kiện nào từ máy khách
 */
@WebSocketGateway({ namespace: 'notifications' })
export class NotificationsGateway
  implements
    OnGatewayInit<NotificationNamespace>,
    OnGatewayConnection<NotificationSocket>,
    OnGatewayDisconnect<NotificationSocket>
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private readonly server!: NotificationNamespace;

  constructor(private readonly tokens: TokenService) {}

  afterInit(namespace: NotificationNamespace): void {
    // Middleware chạy trước khi kết nối được chấp nhận: lỗi ở đây thành connect_error phía máy khách
    namespace.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        () => next(new Error(ErrorCode.UNAUTHORIZED)),
      );
    });
  }

  handleConnection(socket: NotificationSocket): void {
    const { userId, expiresAt } = socket.data;
    void socket.join(userRoom(userId));
    if (expiresAt) {
      const ms = Math.min(Math.max(0, expiresAt.getTime() - Date.now()), MAX_TIMER_MS);
      socket.data.expiryTimer = setTimeout(() => socket.disconnect(true), ms);
    }
  }

  handleDisconnect(socket: NotificationSocket): void {
    clearTimeout(socket.data.expiryTimer);
  }

  /** Phát tới mọi tab đang mở của người dùng; không ai mở thì thôi (đã lưu DB để xem ở chuông) */
  send(userId: string, item: NotificationItem): void {
    // Gateway chưa khởi tạo (test không mở cổng) thì bỏ qua
    if (!this.server) return;
    this.server.to(userRoom(userId)).emit(NOTIFICATION_EVENT, item);
  }

  private async authenticate(socket: NotificationSocket): Promise<void> {
    const { token } = socket.handshake.auth as { token?: unknown };
    if (typeof token !== 'string' || !token) throw new Error('Thiếu access token');
    const user = await this.tokens.verifyAccessToken(token);
    socket.data.userId = user.id;
    socket.data.expiresAt = this.tokens.accessTokenExpiresAt(token);
    this.logger.debug(`Người dùng ${user.id} kết nối /notifications`);
  }
}
