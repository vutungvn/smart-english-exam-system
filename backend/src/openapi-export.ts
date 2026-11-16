// Chạy: npm run openapi:export → ghi backend/openapi.json cho FE sinh client bằng Orval.
// Phải chạy trên bản build bằng tsc (dist/): tsx/esbuild không sinh decorator metadata.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, createOpenApiDocument } from './app.setup.js';
import { findDuplicateOperationIds } from './common/swagger/common-error-responses.js';

// preview: chỉ dựng cây module, không khởi tạo provider → không cần Postgres/Redis đang chạy
const app = await NestFactory.create(AppModule, { preview: true, logger: ['error', 'warn'] });
configureApp(app);

const document = createOpenApiDocument(app);

const duplicates = findDuplicateOperationIds(document);
if (duplicates.length > 0) {
  throw new Error(
    `operationId bị trùng: ${duplicates.join(', ')}. Đổi tên method trong controller cho khác nhau.`,
  );
}

const outFile = resolve(import.meta.dirname, '../openapi.json');
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Đã ghi ${outFile}`);
