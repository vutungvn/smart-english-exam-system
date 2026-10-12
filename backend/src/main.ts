import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema.js';
import { configureApp, setupSwagger } from './app.setup.js';

// Prisma 7 (adapter-pg) chạy song song truy vấn con trên cùng kết nối của transaction
// (ví dụ create lồng nhau kèm select quan hệ); pg vẫn tự xếp hàng nên kết quả đúng.
// Bỏ đoạn này khi Prisma sửa lỗi phía adapter.
const PG_QUERY_QUEUE_WARNING =
  'Calling client.query() when the client is already executing a query';
const emitWarning = process.emitWarning.bind(process) as (...args: unknown[]) => void;
process.emitWarning = (warning: string | Error, ...rest: unknown[]) => {
  const message = typeof warning === 'string' ? warning : warning.message;
  if (message.startsWith(PG_QUERY_QUEUE_WARNING)) return;
  emitWarning(warning, ...rest);
};

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
