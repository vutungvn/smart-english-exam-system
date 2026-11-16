import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

/** Key bộ đếm sống qua hết ngày đó rồi tự xóa */
const KEY_TTL_SECONDS = 2 * 24 * 60 * 60;

/** Bộ đếm lượt AI theo ngày trên Redis */
@Injectable()
export class AiQuotaService {
  constructor(private readonly redis: RedisService) {}

  /** Lấy một lượt nếu còn; false khi đã đủ limit (bộ đếm giữ nguyên) */
  async take(key: string, limit: number): Promise<boolean> {
    const used = await this.redis.incr(key);
    if (used === 1) await this.redis.expire(key, KEY_TTL_SECONDS);
    if (used <= limit) return true;
    await this.redis.decr(key);
    return false;
  }

  /** Trả lại lượt đã lấy khi gọi AI thất bại */
  async give(key: string): Promise<void> {
    await this.redis.decr(key);
  }

  async used(key: string): Promise<number> {
    return Number((await this.redis.get(key)) ?? 0);
  }
}
