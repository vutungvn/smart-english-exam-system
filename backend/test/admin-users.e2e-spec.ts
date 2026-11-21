import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import { UserStatus } from '../src/generated/prisma/enums.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import {
  api,
  createAdmin,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
  PASSWORD,
} from './e2e/helpers.js';

interface UserDetail {
  id: string;
  fullName: string;
  role: string;
  status: UserStatus;
  updatedAt: string;
  student: { targetScore: number | null } | null;
  teacher: { organization: string; specialization: string } | null;
}

interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

describe('Quản lý người dùng /admin/users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminId: string;
  let adminToken: string;
  let studentToken: string;
  // Thẻ riêng trong họ tên để tìm kiếm không lẫn với người dùng do file test khác tạo
  const tag = `zq${randomUUID().slice(0, 6)}`;
  const ids: { studentA: string; studentB: string; teacher: string } = {
    studentA: '',
    studentB: '',
    teacher: '',
  };

  const admin = () => api(app, adminToken);

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const adminUser = await createAdmin(prisma);
    adminId = adminUser.id;
    adminToken = await login(app, adminUser.email);

    const studentA = await createUser(prisma, RoleCode.STUDENT);
    const studentB = await createUser(prisma, RoleCode.STUDENT);
    const teacher = await createUser(prisma, RoleCode.TEACHER);
    ids.studentA = studentA.id;
    ids.studentB = studentB.id;
    ids.teacher = teacher.id;
    await prisma.user.update({ where: { id: studentA.id }, data: { fullName: `An ${tag}` } });
    await prisma.user.update({
      where: { id: studentB.id },
      data: { fullName: `Bình ${tag}`, status: UserStatus.LOCKED },
    });
    await prisma.user.update({ where: { id: teacher.id }, data: { fullName: `Cường ${tag}` } });

    studentToken = await login(app, studentA.email);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('phân quyền', () => {
    it('học viên gọi → 403, khách gọi → 401', async () => {
      expect((await api(app, studentToken).get('/admin/users')).status).toBe(403);
      expect((await api(app).get('/admin/users')).status).toBe(401);
    });

    it('mọi thao tác trên tài khoản admin → 403 ADMIN_ACCOUNT_PROTECTED', async () => {
      const responses = await Promise.all([
        admin().get(`/admin/users/${adminId}`),
        admin().patch(`/admin/users/${adminId}`, { updatedAt: new Date().toISOString() }),
        admin().post(`/admin/users/${adminId}/lock`),
        admin().post(`/admin/users/${adminId}/unlock`),
        admin().get(`/admin/users/${adminId}/login-history`),
      ]);
      for (const res of responses) {
        expect(res.status).toBe(403);
        expect(errorOf(res).code).toBe('ADMIN_ACCOUNT_PROTECTED');
      }
    });

    it('id không tồn tại hoặc sai định dạng → 404 USER_NOT_FOUND', async () => {
      for (const id of [randomUUID(), 'abc']) {
        const res = await admin().get(`/admin/users/${id}`);
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('USER_NOT_FOUND');
      }
    });
  });

  describe('GET /admin/users', () => {
    it('tìm theo họ tên không phân biệt hoa thường, không có admin', async () => {
      const res = await admin().get(`/admin/users?q=${tag.toUpperCase()}`);
      expect(res.status).toBe(200);
      const page = res.body as Page<{ id: string; role: string }>;
      expect(page.data.map((u) => u.id).sort()).toEqual(
        [ids.studentA, ids.studentB, ids.teacher].sort(),
      );
      expect(page.data.every((u) => u.role !== RoleCode.ADMIN)).toBe(true);

      const all = await admin().get('/admin/users?limit=100');
      expect((all.body as Page<{ id: string }>).data.some((u) => u.id === adminId)).toBe(false);
    });

    it('tìm theo email', async () => {
      const { email } = await prisma.user.findUniqueOrThrow({ where: { id: ids.teacher } });
      const page = (await admin().get(`/admin/users?q=${email}`)).body as Page<{ id: string }>;
      expect(page.data.map((u) => u.id)).toEqual([ids.teacher]);
    });

    it('lọc theo vai trò và trạng thái', async () => {
      const teachers = (await admin().get(`/admin/users?q=${tag}&role=TEACHER`)).body as Page<{
        id: string;
      }>;
      expect(teachers.data.map((u) => u.id)).toEqual([ids.teacher]);

      const locked = (await admin().get(`/admin/users?q=${tag}&status=LOCKED`)).body as Page<{
        id: string;
      }>;
      expect(locked.data.map((u) => u.id)).toEqual([ids.studentB]);
    });

    it('phân trang, sắp xếp theo họ tên', async () => {
      const first = (await admin().get(`/admin/users?q=${tag}&limit=2&sort=fullName:asc`))
        .body as Page<{ id: string }>;
      expect(first.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
      expect(first.data.map((u) => u.id)).toEqual([ids.studentA, ids.studentB]);

      const second = (await admin().get(`/admin/users?q=${tag}&limit=2&page=2&sort=fullName:asc`))
        .body as Page<{ id: string }>;
      expect(second.data.map((u) => u.id)).toEqual([ids.teacher]);
    });

    it('lọc role=ADMIN, sort sai → 400', async () => {
      expect((await admin().get('/admin/users?role=ADMIN')).status).toBe(400);
      expect((await admin().get('/admin/users?sort=password:asc')).status).toBe(400);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('trả hồ sơ theo vai trò, không lộ passwordHash', async () => {
      const student = await admin().get(`/admin/users/${ids.studentA}`);
      expect(student.status).toBe(200);
      const body = data<UserDetail & Record<string, unknown>>(student);
      expect(body.student).not.toBeNull();
      expect(body.teacher).toBeNull();
      expect(body.hasPassword).toBe(true);
      expect(body).not.toHaveProperty('passwordHash');

      const teacher = data<UserDetail>(await admin().get(`/admin/users/${ids.teacher}`));
      expect(teacher.teacher).toMatchObject({ organization: 'E2E', specialization: 'TOEIC' });
      expect(teacher.student).toBeNull();
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('sửa họ tên, điểm mục tiêu và ghi nhật ký user.update', async () => {
      const before = data<UserDetail>(await admin().get(`/admin/users/${ids.studentA}`));
      const res = await admin().patch(`/admin/users/${ids.studentA}`, {
        updatedAt: before.updatedAt,
        fullName: `An Mới ${tag}`,
        targetScore: 800,
      });
      expect(res.status).toBe(200);
      const after = data<UserDetail>(res);
      expect(after.fullName).toBe(`An Mới ${tag}`);
      expect(after.student?.targetScore).toBe(800);
      expect(after.updatedAt).not.toBe(before.updatedAt);

      const log = await prisma.auditLog.findFirstOrThrow({
        where: { action: 'user.update', entityId: ids.studentA },
        orderBy: { createdAt: 'desc' },
      });
      expect(log).toMatchObject({ actorId: adminId, entity: 'user' });
      expect(log.before).toMatchObject({ fullName: `An ${tag}` });
      expect(log.after).toMatchObject({ fullName: `An Mới ${tag}`, targetScore: 800 });

      // Gửi lại updatedAt cũ: đã có người sửa sau đó
      const stale = await admin().patch(`/admin/users/${ids.studentA}`, {
        updatedAt: before.updatedAt,
        fullName: 'Ghi đè',
      });
      expect(stale.status).toBe(409);
      expect(errorOf(stale).code).toBe('VERSION_CONFLICT');
    });

    it('người dùng đăng nhập không làm đổi updatedAt (không gây 409 giả)', async () => {
      const user = await createUser(prisma, RoleCode.STUDENT);
      const before = data<UserDetail>(await admin().get(`/admin/users/${user.id}`));

      await login(app, user.email);
      const { lastLoginAt } = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(lastLoginAt).not.toBeNull();

      const res = await admin().patch(`/admin/users/${user.id}`, {
        updatedAt: before.updatedAt,
        fullName: `Đã sửa ${tag}`,
      });
      expect(res.status).toBe(200);
    });

    it('giáo viên sửa đơn vị công tác, chuyên môn', async () => {
      const current = data<UserDetail>(await admin().get(`/admin/users/${ids.teacher}`));
      const res = await admin().patch(`/admin/users/${ids.teacher}`, {
        updatedAt: current.updatedAt,
        organization: 'Trường B',
        specialization: 'TOEIC Speaking',
      });
      expect(res.status).toBe(200);
      expect(data<UserDetail>(res).teacher).toMatchObject({
        organization: 'Trường B',
        specialization: 'TOEIC Speaking',
      });
    });

    it('gửi trường không khớp vai trò → 400', async () => {
      const current = data<UserDetail>(await admin().get(`/admin/users/${ids.studentA}`));
      const res = await admin().patch(`/admin/users/${ids.studentA}`, {
        updatedAt: current.updatedAt,
        organization: 'Trường B',
      });
      expect(res.status).toBe(400);
      expect(errorOf(res).code).toBe('BAD_REQUEST');
    });
  });

  describe('khóa, mở khóa', () => {
    it('khóa: access token còn hạn, refresh, đăng nhập đều bị chặn ngay; ghi nhật ký', async () => {
      const user = await createUser(prisma, RoleCode.STUDENT);
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: PASSWORD });
      const accessToken = data<{ accessToken: string }>(loginRes).accessToken;
      const cookies = loginRes.get('Set-Cookie') ?? [];
      expect((await api(app, accessToken).get('/me')).status).toBe(200);

      const locked = await admin().post(`/admin/users/${user.id}/lock`, { reason: 'Vi phạm' });
      expect(locked.status).toBe(200);
      expect(data<UserDetail>(locked).status).toBe(UserStatus.LOCKED);

      // Access token cấp trước lúc khóa: 401 để FE thử refresh rồi đăng xuất
      expect((await api(app, accessToken).get('/me')).status).toBe(401);

      const refresh = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies);
      expect(refresh.status).toBe(401);

      const relogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: PASSWORD });
      expect(relogin.status).toBe(403);
      expect(errorOf(relogin).code).toBe('AUTH_ACCOUNT_LOCKED');

      const again = await admin().post(`/admin/users/${user.id}/lock`);
      expect(again.status).toBe(409);
      expect(errorOf(again).code).toBe('USER_ALREADY_LOCKED');

      const log = await prisma.auditLog.findFirstOrThrow({
        where: { action: 'user.lock', entityId: user.id },
      });
      expect(log).toMatchObject({
        actorId: adminId,
        entity: 'user',
        before: { status: UserStatus.ACTIVE },
        after: { status: UserStatus.LOCKED },
        meta: { reason: 'Vi phạm' },
      });

      // Mở khóa: đăng nhập lại bình thường
      const unlocked = await admin().post(`/admin/users/${user.id}/unlock`);
      expect(unlocked.status).toBe(200);
      expect(data<UserDetail>(unlocked).status).toBe(UserStatus.ACTIVE);
      const token = await login(app, user.email);
      expect((await api(app, token).get('/me')).status).toBe(200);

      const unlockAgain = await admin().post(`/admin/users/${user.id}/unlock`);
      expect(unlockAgain.status).toBe(409);
      expect(errorOf(unlockAgain).code).toBe('USER_NOT_LOCKED');

      expect(
        await prisma.auditLog.count({ where: { action: 'user.unlock', entityId: user.id } }),
      ).toBe(1);
    });

    it('thao tác lỗi thì không ghi nhật ký', async () => {
      const count = await prisma.auditLog.count({
        where: { action: 'user.unlock', entityId: ids.studentA },
      });
      expect((await admin().post(`/admin/users/${ids.studentA}/unlock`)).status).toBe(409);
      expect(
        await prisma.auditLog.count({ where: { action: 'user.unlock', entityId: ids.studentA } }),
      ).toBe(count);
    });

    it('mở khóa tài khoản chưa xác minh email → PENDING_VERIFICATION', async () => {
      const user = await createUser(prisma, RoleCode.STUDENT);
      await prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.PENDING_VERIFICATION, emailVerifiedAt: null },
      });

      expect((await admin().post(`/admin/users/${user.id}/lock`)).status).toBe(200);
      const res = await admin().post(`/admin/users/${user.id}/unlock`);
      expect(data<UserDetail>(res).status).toBe(UserStatus.PENDING_VERIFICATION);
    });

    it('mở khóa giáo viên chưa được duyệt → PENDING_APPROVAL', async () => {
      const user = await createUser(prisma, RoleCode.TEACHER);
      await prisma.teacher.update({ where: { userId: user.id }, data: { isApproved: false } });

      expect((await admin().post(`/admin/users/${user.id}/lock`)).status).toBe(200);
      const res = await admin().post(`/admin/users/${user.id}/unlock`);
      expect(data<UserDetail>(res).status).toBe(UserStatus.PENDING_APPROVAL);
    });
  });

  describe('GET /admin/users/:id/login-history', () => {
    it('trả lịch sử của đúng người đó, mới nhất trước', async () => {
      const user = await createUser(prisma, RoleCode.TEACHER);
      await login(app, user.email);
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'Sai@12345' });

      const res = await admin().get(`/admin/users/${user.id}/login-history`);
      expect(res.status).toBe(200);
      const page = res.body as Page<{ success: boolean; failureReason: string | null }>;
      expect(page.meta.total).toBe(2);
      expect(page.data.map((item) => item.success)).toEqual([false, true]);
      expect(page.data[0].failureReason).toBe('INVALID_PASSWORD');
    });
  });
});
