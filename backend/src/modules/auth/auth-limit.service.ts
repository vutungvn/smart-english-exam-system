import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { RedisService } from '../../infra/redis/redis.service.js';
import {
  EMAIL_REQUEST_LIMIT,
  EMAIL_REQUEST_WINDOW_SECONDS,
  LOGIN_FAILURE_LIMIT,
  LOGIN_FAILURE_WINDOW_SECONDS,
  LOGIN_LOCK_SECONDS,
  redisKeys,
} from './auth.constants.js';
import type { EmailRequestKind } from './auth.constants.js';

// Giới hạn tần suất cho các thao tác auth: gửi email, khóa đăng nhập sau nhiều lần sai
@Injectable()
export class AuthLimitService {
  constructor(private readonly redis: RedisService) {}

  /** Mỗi địa chỉ email chỉ được yêu cầu gửi mail tối đa EMAIL_REQUEST_LIMIT lần trong cửa sổ thời gian */
  async assertEmailQuota(kind: EmailRequestKind, email: string): Promise<void> {
    const key = redisKeys.emailRequests(kind, email);

    const count = await this.redis.incr(key);
    // Lần đầu tiên mở cửa sổ đếm 15 phút; hết cửa sổ Redis tự xóa key, đếm lại từ 0
    if (count === 1) await this.redis.expire(key, EMAIL_REQUEST_WINDOW_SECONDS);

    if (count > EMAIL_REQUEST_LIMIT) {
      throw new AppException(
        ErrorCode.TOO_MANY_REQUESTS,
        'Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau 15 phút',
      );
    }
  }

  /** Số giây còn bị khóa đăng nhập, 0 nghĩa là không bị khóa */
  async loginLockRemaining(email: string): Promise<number> {
    const key = redisKeys.loginFailures(email);

    // GET trả null khi chưa có key → Number(null) = 0
    const failures = Number(await this.redis.get(key));
    if (failures < LOGIN_FAILURE_LIMIT) return 0;

    // TTL trả -2 nếu key vừa hết hạn giữa hai lệnh → coi như đã mở khóa
    return Math.max(await this.redis.ttl(key), 0);
  }

  /** Ghi một lần sai mật khẩu; lần này chạm ngưỡng thì trả về số giây bị khóa, ngược lại 0 */
  async recordLoginFailure(email: string): Promise<number> {
    const key = redisKeys.loginFailures(email);

    const failures = await this.redis.incr(key);
    if (failures === 1) await this.redis.expire(key, LOGIN_FAILURE_WINDOW_SECONDS);
    if (failures < LOGIN_FAILURE_LIMIT) return 0;

    // Chạm ngưỡng: đặt lại TTL đủ 15 phút tính từ lần sai này, key còn thì còn khóa
    await this.redis.expire(key, LOGIN_LOCK_SECONDS);
    return LOGIN_LOCK_SECONDS;
  }

  /** Đăng nhập đúng hoặc đặt lại mật khẩu xong thì xóa bộ đếm */
  async resetLoginFailures(email: string): Promise<void> {
    await this.redis.del(redisKeys.loginFailures(email));
  }
}
