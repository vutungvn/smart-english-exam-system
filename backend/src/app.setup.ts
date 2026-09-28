import { VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

// Dùng chung cho main.ts và test để route luôn là /api/v1/...
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
}
