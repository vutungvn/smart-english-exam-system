import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { api, createTestApp, createUser, data, errorOf, login, PASSWORD } from './e2e/helpers.js';

const NEW_PASSWORD = 'E2eNew@12345';

describe('Buộc đổi mật khẩu (mustChangePassword) chặn API ở server (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let email: string;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const user = await createUser(prisma, RoleCode.TEACHER);
    email = user.email;
    await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
    token = await login(app, email);
  });

  afterAll(async () => {
    await app.close();
  });

  it('chưa đổi mật khẩu: route khác bị 403 AUTH_PASSWORD_CHANGE_REQUIRED', async () => {
    for (const url of ['/me/notifications', '/me/login-history', '/teacher/questions']) {
      const res = await api(app, token).get(url);
      expect(res.status, url).toBe(403);
      expect(errorOf(res).code, url).toBe('AUTH_PASSWORD_CHANGE_REQUIRED');
    }
  });

  it('chưa đổi mật khẩu: vẫn xem được hồ sơ', async () => {
    const res = await api(app, token).get('/me');
    expect(res.status).toBe(200);
  });

  it('đổi mật khẩu xong, đăng nhập lại thì gọi API bình thường', async () => {
    const changed = await api(app, token).patch('/me/password', {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });
    expect(changed.status).toBe(200);

    const relogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: NEW_PASSWORD });
    expect(relogin.status).toBe(200);
    const session = data<{ accessToken: string; user: { mustChangePassword: boolean } }>(relogin);
    expect(session.user.mustChangePassword).toBe(false);

    const res = await api(app, session.accessToken).get('/me/notifications');
    expect(res.status).toBe(200);
  });
});
