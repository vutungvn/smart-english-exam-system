import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import { AttemptMode, AttemptStatus, UserStatus } from '../src/generated/prisma/enums.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import type {
  DashboardOverview,
  DashboardTrends,
} from '../src/modules/admin-dashboard/admin-dashboard.types.js';
import { addDays, todayInVietnam } from '../src/modules/admin-dashboard/dashboard-range.js';
import {
  api,
  createAdmin,
  createExam,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
} from './e2e/helpers.js';

describe('Dashboard thống kê /admin/dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: ReturnType<typeof api>;
  let student: ReturnType<typeof api>;
  let teacher: ReturnType<typeof api>;

  const overview = async () =>
    data<DashboardOverview>(await admin.get('/admin/dashboard/overview'));

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    admin = api(app, await login(app, (await createAdmin(prisma)).email));
    student = api(app, await login(app, (await createUser(prisma, RoleCode.STUDENT)).email));
    teacher = api(app, await login(app, (await createUser(prisma, RoleCode.TEACHER)).email));
    // Bỏ số liệu còn lưu từ lần chạy trước
    expect((await admin.post('/admin/dashboard/refresh')).status).toBe(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('chỉ admin được xem và làm mới', async () => {
    for (const caller of [student, teacher]) {
      expect((await caller.get('/admin/dashboard/overview')).status).toBe(403);
      expect((await caller.get('/admin/dashboard/trends')).status).toBe(403);
      expect((await caller.post('/admin/dashboard/refresh')).status).toBe(403);
    }
  });

  it('kỳ không hợp lệ → 400', async () => {
    const reversed = await admin.get('/admin/dashboard/overview?from=2026-11-10&to=2026-11-01');
    expect(reversed.status).toBe(400);
    expect(errorOf(reversed).code).toBe('BAD_REQUEST');

    const tooLong = await admin.get('/admin/dashboard/trends?from=2025-01-01&to=2026-11-01');
    expect(tooLong.status).toBe(400);

    expect((await admin.get('/admin/dashboard/overview?from=2026-02-30')).status).toBe(400);
    expect((await admin.get('/admin/dashboard/trends?granularity=month')).status).toBe(400);
  });

  it('overview lưu cache, làm mới thì tính lại đúng mức tăng', async () => {
    const before = await overview();
    expect(before.range.to).toBe(todayInVietnam(new Date()));

    // DB e2e dùng chung giữa các file: so mức tăng thay vì số tuyệt đối
    await createUser(prisma, RoleCode.STUDENT);
    await createUser(prisma, RoleCode.STUDENT);
    const pending = await createUser(prisma, RoleCode.TEACHER);
    await prisma.user.update({
      where: { id: pending.id },
      data: { status: UserStatus.PENDING_APPROVAL },
    });

    // Chưa làm mới: vẫn là số đã lưu
    const cached = await overview();
    expect(cached.generatedAt).toBe(before.generatedAt);
    expect(cached.users.total).toBe(before.users.total);

    const refreshed = await admin.post('/admin/dashboard/refresh');
    expect(refreshed.status).toBe(200);

    const after = await overview();
    expect(after.generatedAt).not.toBe(before.generatedAt);
    expect(after.users.total).toBe(before.users.total + 3);
    expect(after.users.byRole.STUDENT).toBe(before.users.byRole.STUDENT + 2);
    expect(after.users.byRole.TEACHER).toBe(before.users.byRole.TEACHER + 1);
    expect(after.users.newInRange).toBe(before.users.newInRange + 3);
    expect(after.users.pendingApproval).toBe(before.users.pendingApproval + 1);
    expect(after.users.total).toBe(
      after.users.byRole.STUDENT + after.users.byRole.TEACHER + after.users.byRole.ADMIN,
    );
    // Có ít nhất 3 lần đăng nhập thành công (admin, học viên, giáo viên) trong beforeAll
    expect(after.access.logins).toBeGreaterThanOrEqual(3);
    expect(after.access.activeUsers).toBeGreaterThanOrEqual(3);
  });

  it('lượt hủy, lượt làm dở vẫn tính vào started nên kéo tỉ lệ hoàn thành xuống', async () => {
    const before = await overview();

    const author = await createUser(prisma, RoleCode.TEACHER);
    const { examId } = await createExam(prisma, author.id);
    const { id: studentId } = await createUser(prisma, RoleCode.STUDENT);
    // Gán startedAt rõ ràng: mặc định now() của DB có thể lệch giờ với Node, vi phạm
    // ck_attempts_submitted (submitted_at >= started_at)
    const startedAt = new Date(Date.now() - 60_000);
    for (const status of [
      AttemptStatus.GRADED,
      AttemptStatus.CANCELLED,
      AttemptStatus.IN_PROGRESS,
    ]) {
      await prisma.examAttempt.create({
        data: {
          studentId,
          examId,
          mode: AttemptMode.FULL,
          status,
          startedAt,
          // ck_attempts_status_graded: lượt GRADED phải có điểm
          ...(status === AttemptStatus.GRADED ? { submittedAt: new Date(), scaledScore: 50 } : {}),
        },
      });
    }

    expect((await admin.post('/admin/dashboard/refresh')).status).toBe(200);
    const after = await overview();
    expect(after.attempts.started).toBe(before.attempts.started + 3);
    expect(after.attempts.completed).toBe(before.attempts.completed + 1);
    expect(after.attempts.completionRate).toBe(
      Math.round((after.attempts.completed / after.attempts.started) * 1000) / 10,
    );
  });

  it('trends theo ngày: đủ mốc, hôm nay có người dùng mới', async () => {
    const today = todayInVietnam(new Date());
    const from = addDays(today, -6);
    const res = await admin.get(`/admin/dashboard/trends?from=${from}&to=${today}`);
    expect(res.status).toBe(200);

    const trends = data<DashboardTrends>(res);
    expect(trends.granularity).toBe('day');
    expect(trends.points.map((point) => point.bucket)).toEqual(
      Array.from({ length: 7 }, (_, index) => addDays(from, index)),
    );
    const todayPoint = trends.points.at(-1);
    expect(todayPoint?.newUsers).toBeGreaterThanOrEqual(3);
    expect(todayPoint?.logins).toBeGreaterThanOrEqual(3);
    // 3 lượt ở test trước, kể cả lượt đã hủy
    expect(todayPoint?.attempts).toBeGreaterThanOrEqual(3);
  });

  it('trends theo tuần: mốc là thứ Hai, kỳ bắt đầu giữa tuần', async () => {
    const res = await admin.get(
      '/admin/dashboard/trends?from=2026-11-04&to=2026-11-10&granularity=week',
    );
    expect(res.status).toBe(200);
    const trends = data<DashboardTrends>(res);
    expect(trends.points.map((point) => point.bucket)).toEqual(['2026-11-02', '2026-11-09']);
  });
});
