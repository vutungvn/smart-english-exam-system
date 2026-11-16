import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema.js';
import { AiGateway } from './ai-gateway.service.js';
import { AiProvider } from './ai-provider.js';
import { AiQuotaService } from './ai-quota.service.js';
import { FakeAiProvider } from './fake-ai.provider.js';
import { GeminiProvider } from './gemini.provider.js';

// Nghiệp vụ chỉ inject AiGateway; có GEMINI_API_KEY thì gọi Gemini, không thì dùng dữ liệu mẫu
@Global()
@Module({
  providers: [
    {
      provide: AiProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): AiProvider => {
        const logger = new Logger('AiModule');
        // Chạy test không bao giờ gọi Google
        if (
          config.get('NODE_ENV', { infer: true }) === 'test' ||
          !config.get('GEMINI_API_KEY', { infer: true })
        ) {
          logger.warn('Chưa có GEMINI_API_KEY: dùng FakeAiProvider (kết quả AI là dữ liệu mẫu)');
          return new FakeAiProvider();
        }
        const provider = new GeminiProvider(config);
        logger.log(`Dùng Gemini: ${provider.models.join(' → ')}`);
        return provider;
      },
    },
    AiQuotaService,
    AiGateway,
  ],
  exports: [AiGateway],
})
export class AiModule {}
