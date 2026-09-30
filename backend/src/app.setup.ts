import { VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { REFRESH_COOKIE_NAME } from './modules/auth/auth.constants.js';

// Dùng chung cho main.ts và test để route luôn là /api/v1/...
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Đọc cookie refresh token vào req.cookies
  app.use(cookieParser());
}

// Tài liệu API tại /api/docs; nút Authorize nhận access token dạng Bearer
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Smart Exam Learning System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE_NAME)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
