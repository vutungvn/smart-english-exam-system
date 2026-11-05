import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createTestApp, data } from './e2e/helpers.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1 trả về phản hồi đã bọc { success, status, data }', async () => {
    const res = await api(app).get('');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 200 });
    expect(data<string>(res)).toBe('Hello World!');
  });
});
