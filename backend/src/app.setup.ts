import { VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { REFRESH_COOKIE_NAME } from './modules/auth/auth.constants.js';
import { addCommonErrorResponses } from './common/swagger/common-error-responses.js';
import { ErrorEnvelopeDto, PaginationMetaDto } from './common/swagger/envelope.schemas.js';

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

// Dùng chung cho Swagger UI và script openapi:export để hai nơi luôn ra cùng một tài liệu
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Smart English Exam System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE_NAME)
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // Luôn có schema vỏ lỗi và meta phân trang, kể cả khi chưa route nào tham chiếu
    extraModels: [ErrorEnvelopeDto, PaginationMetaDto],
    // operationId = tên method (login, getProfile) → Orval sinh hook useLogin, useGetProfile.
    // Vì vậy tên method trong controller phải duy nhất toàn hệ thống.
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });

  addCommonErrorResponses(document);
  return document;
}

// Tài liệu API tại /api/docs; nút Authorize nhận access token dạng Bearer
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, createOpenApiDocument(app), {
    swaggerOptions: { persistAuthorization: true },
  });
}
