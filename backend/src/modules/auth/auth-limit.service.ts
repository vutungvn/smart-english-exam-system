import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { RedisService } from '../../infra/redis/redis.service.js';
import { EMAIL_REQUEST_LIMIT, EMAIL_REQUEST_WINDOW_SECONDS, redisKeys } from './auth.constants.js';
import type { EmailRequestKind } from './auth.constants.js';

// Giới hạn tần suất cho các thao tác auth; sau này thêm khóa đăng nhập sau 5 lần sai
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
        'Bạn đã yêu cầu gửi lại quá nhiều lần, vui lòng thử lại sau 15 phút',
      );
    }
  }
}
