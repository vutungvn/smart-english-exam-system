import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema.js';
import { configureApp, setupSwagger } from './app.setup.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Nạp file env
  const config = app.get<ConfigService, ConfigService<Env, true>>(ConfigService);

  // Cấu hình port trong env
  const port = config.get('PORT', { infer: true });

  // Config prefix /api/v1
  configureApp(app);

  // Setup swagger (/api/docs)
  const swaggerEnabled = config.get('NODE_ENV', { infer: true }) !== 'production';
  if (swaggerEnabled) setupSwagger(app);

  app.enableShutdownHooks();

  await app.listen(port);
  Logger.log(`API đang chạy tại http://localhost:${port}/api/v1`, 'Bootstrap');
}

await bootstrap();
