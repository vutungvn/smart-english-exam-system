import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Env } from '../../config/env.schema.js';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(config: ConfigService<Env, true>) {
    super(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: 3 });
    // Không có listener 'error' thì ioredis in cảnh báo "Unhandled error event" mỗi lần mất kết nối
    this.on('error', (error: Error) => this.logger.error(`Lỗi Redis: ${error.message}`));
  }

  async onModuleInit(): Promise<void> {
    await this.ping();
    this.logger.log('Đã kết nối Redis');
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
