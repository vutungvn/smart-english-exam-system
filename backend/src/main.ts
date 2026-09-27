import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger, VersioningType } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // 1. Set prefix chung
  app.setGlobalPrefix('api');

  // 2. Bật versioning theo URI
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1', // Mặc định tất cả route sẽ có /v1/
  });

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API đang chạy tại http://localhost:${port}/api/v1`, 'Bootstrap');
}

await bootstrap();
