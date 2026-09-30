import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service.js';
import { VERIFY_EMAIL_TTL_SECONDS, redisKeys } from './auth.constants.js';
import type { OneTimeTokenPurpose } from './auth.constants.js';

const TTL_SECONDS: Record<OneTimeTokenPurpose, number> = {
  'verify-email': VERIFY_EMAIL_TTL_SECONDS,
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// Token gửi qua email (xác minh email, sau này là đặt lại mật khẩu): ngẫu nhiên, lưu hash, dùng một lần
@Injectable()
export class OneTimeTokenService {
  constructor(private readonly redis: RedisService) {}

  /** Sinh token mới cho user; token cũ cùng mục đích (nếu có) bị hủy. Trả token gốc để gửi qua email. */
  async create(purpose: OneTimeTokenPurpose, userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = sha256(token);
    const ttl = TTL_SECONDS[purpose];
    const userKey = redisKeys.oneTimeTokenOf(purpose, userId);

    const previousHash = await this.redis.get(userKey);

    const tx = this.redis.multi();
    if (previousHash) tx.del(redisKeys.oneTimeToken(purpose, previousHash));
    tx.set(redisKeys.oneTimeToken(purpose, tokenHash), userId, 'EX', ttl);
    tx.set(userKey, tokenHash, 'EX', ttl);
    await tx.exec();

    return token;
  }

  /** Trả userId và hủy token ngay; null nếu token sai, hết hạn hoặc đã dùng */
  async consume(purpose: OneTimeTokenPurpose, token: string): Promise<string | null> {
    const userId = await this.redis.getdel(redisKeys.oneTimeToken(purpose, sha256(token)));
    if (userId) await this.redis.del(redisKeys.oneTimeTokenOf(purpose, userId));
    return userId;
  }
}
