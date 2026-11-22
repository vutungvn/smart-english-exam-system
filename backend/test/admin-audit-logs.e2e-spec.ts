import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Response } from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import type {
  AuditLogDetail,
  AuditLogFilterOptions,
  AuditLogListItem,
} from '../src/modules/admin-audit-logs/admin-audit-logs.types.js';
import {
  api,
  createAdmin,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
} from './e2e/helpers.js';

interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Đọc nguyên body nhị phân (xlsx): supertest chỉ tự gom body dạng văn bản, JSON */
function binaryParser(res: Response, callback: (err: Error | null, body: Buffer) => void): void {
  const stream = res as unknown as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  stream.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('Nhật ký kiểm toán /admin/audit-logs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminId: string;
  let adminEmail: string;
  let admin: ReturnType<typeof api>;
  let student: ReturnType<typeof api>;
  let teacher: ReturnType<typeof api>;
  let targetId: string;
  let startedAt: string;

  const page = <T>(res: { body: unknown }) => res.body as Page<T>;
  const logsOf = async (query: string) =>
    page<AuditLogListItem>(await admin.get(`/admin/audit-logs?limit=100&${query}`));

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    startedAt = new Date(Date.now() - 1000).toISOString();

    const adminUser = await createAdmin(prisma);
    adminId = adminUser.id;
    adminEmail = adminUser.email;
    admin = api(app, await login(app, adminUser.email));

    const studentUser = await createUser(prisma, RoleCode.STUDENT);
    student = api(app, await login(app, studentUser.email));
    teacher = api(app, await login(app, (await createUser(prisma, RoleCode.TEACHER)).email));

    // Dữ liệu nhật ký: khóa (có lý do) rồi mở khóa một học viên khác
    targetId = (await createUser(prisma, RoleCode.STUDENT)).id;
    expect(
      (await admin.post(`/admin/users/${targetId}/lock`, { reason: 'Vi phạm quy chế thi' })).status,
    ).toBe(200);
    expect((await admin.post(`/admin/users/${targetId}/unlock`)).status).toBe(200);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('phân quyền', () => {
    it('học viên, giáo viên → 403; khách → 401', async () => {
      for (const caller of [student, teacher]) {
        const responses = await Promise.all([
          caller.get('/admin/audit-logs'),
          caller.get('/admin/audit-logs/filters'),
          caller.get(`/admin/audit-logs/${randomUUID()}`),
          caller.post('/admin/audit-logs/export', { format: 'csv' }),
        ]);
        for (const res of responses) expect(res.status).toBe(403);
      }
      expect((await api(app).get('/admin/audit-logs')).status).toBe(401);
    });

    it('không có route sửa, xóa nhật ký', async () => {
      const [log] = (await logsOf(`entityId=${targetId}`)).data;
      const patch = await admin.patch(`/admin/audit-logs/${log.id}`, { action: 'x.y' });
      expect(patch.status).toBe(404);
    });
  });

  describe('GET /admin/audit-logs', () => {
    it('mới nhất trước, kèm người thực hiện và tổng số bản ghi', async () => {
      const res = await admin.get(`/admin/audit-logs?entity=user&entityId=${targetId}`);
      expect(res.status).toBe(200);
      const { data: rows, meta } = page<AuditLogListItem>(res);
      expect(rows.map((row) => row.action)).toEqual(['user.unlock', 'user.lock']);
      expect(meta.total).toBe(2);
      expect(rows[0]).toMatchObject({
        entity: 'user',
        entityId: targetId,
        actor: { id: adminId, email: adminEmail, role: RoleCode.ADMIN },
      });
      expect(rows[0].ipAddress).toBeTruthy();
      // Danh sách không trả before/after
      expect(rows[0]).not.toHaveProperty('before');

      const asc = await logsOf(`entityId=${targetId}&sort=createdAt:asc`);
      expect(asc.data.map((row) => row.action)).toEqual(['user.lock', 'user.unlock']);
    });

    it('lọc theo hành động, người thực hiện, từ khóa, khoảng thời gian', async () => {
      const byAction = await logsOf(`action=user.lock&entityId=${targetId}`);
      expect(byAction.data.map((row) => row.action)).toEqual(['user.lock']);

      expect((await logsOf(`actorId=${adminId}`)).meta.total).toBeGreaterThanOrEqual(2);
      const byEmail = await logsOf(`q=${adminEmail.toUpperCase()}`);
      expect(byEmail.data.length).toBeGreaterThanOrEqual(2);
      expect(byEmail.data.every((row) => row.actor?.id === adminId)).toBe(true);

      const inRange = await logsOf(
        `entityId=${targetId}&from=${encodeURIComponent(startedAt)}&to=${encodeURIComponent(new Date().toISOString())}`,
      );
      expect(inRange.meta.total).toBe(2);
      const future = new Date(Date.now() + 60_000).toISOString();
      expect(
        (await logsOf(`entityId=${targetId}&from=${encodeURIComponent(future)}`)).meta.total,
      ).toBe(0);
    });

    it('điều kiện sai → 400', async () => {
      const reversed = await admin.get(
        `/admin/audit-logs?from=2026-12-01T00:00:00Z&to=2026-11-01T00:00:00Z`,
      );
      expect(reversed.status).toBe(400);
      expect(errorOf(reversed).code).toBe('BAD_REQUEST');

      for (const query of ['limit=101', 'actorId=abc', 'from=hom-qua', 'sort=action:asc']) {
        const res = await admin.get(`/admin/audit-logs?${query}`);
        expect(res.status).toBe(400);
        expect(errorOf(res).code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('GET /admin/audit-logs/filters', () => {
    it('có hành động, đối tượng đã ghi kèm nhãn tiếng Việt', async () => {
      const options = data<AuditLogFilterOptions>(await admin.get('/admin/audit-logs/filters'));
      expect(options.actions).toContainEqual({ value: 'user.lock', label: 'Khóa tài khoản' });
      expect(options.entities).toContainEqual({ value: 'user', label: 'Người dùng' });
    });
  });

  describe('GET /admin/audit-logs/:id', () => {
    it('trả dữ liệu trước, sau và lý do khóa', async () => {
      const [lock] = (await logsOf(`action=user.lock&entityId=${targetId}`)).data;
      const res = await admin.get(`/admin/audit-logs/${lock.id}`);
      expect(res.status).toBe(200);
      expect(data<AuditLogDetail>(res)).toMatchObject({
        id: lock.id,
        action: 'user.lock',
        before: { status: 'ACTIVE' },
        after: { status: 'LOCKED' },
        meta: { reason: 'Vi phạm quy chế thi' },
      });
    });

    it('id không tồn tại hoặc sai định dạng → 404 AUDIT_LOG_NOT_FOUND', async () => {
      for (const id of [randomUUID(), 'abc']) {
        const res = await admin.get(`/admin/audit-logs/${id}`);
        expect(res.status).toBe(404);
        expect(errorOf(res).code).toBe('AUDIT_LOG_NOT_FOUND');
      }
    });
  });

  describe('POST /admin/audit-logs/export', () => {
    it('CSV: có BOM, tiêu đề tiếng Việt, đúng các dòng lọc; việc xuất được ghi nhật ký', async () => {
      const res = await admin.post('/admin/audit-logs/export', {
        format: 'csv',
        entityId: targetId,
      });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="audit-logs-\d{8}-\d{4}\.csv"/,
      );
      const lines = res.text.trimEnd().split('\r\n');
      // Ký tự đầu là BOM UTF-8 để Excel đọc đúng tiếng Việt
      expect(lines[0].charCodeAt(0)).toBe(0xfeff);
      expect(lines[0].slice(1).startsWith('Thời điểm,Người thực hiện')).toBe(true);
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('Mở khóa tài khoản');
      expect(lines[2]).toContain(adminEmail);

      const [exported] = (await logsOf(`action=audit_log.export&actorId=${adminId}`)).data;
      const detail = data<AuditLogDetail>(await admin.get(`/admin/audit-logs/${exported.id}`));
      expect(detail.meta).toMatchObject({
        format: 'csv',
        rows: 2,
        filters: { entityId: targetId },
      });
    });

    it('Excel: mặc định xlsx, đọc lại được', async () => {
      const res = await admin
        .post('/admin/audit-logs/export', { entityId: targetId })
        .buffer(true)
        .parse(binaryParser);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body as ArrayBuffer);
      const sheet = workbook.getWorksheet('nhat-ky');
      expect(sheet?.rowCount).toBe(3);
      expect(sheet?.getCell('A1').value).toBe('Thời điểm');
      expect(sheet?.getCell('E3').value).toBe('user.lock');
    });

    it('điều kiện sai → 400, định dạng không hỗ trợ → 400', async () => {
      const reversed = await admin.post('/admin/audit-logs/export', {
        from: '2026-12-01T00:00:00Z',
        to: '2026-11-01T00:00:00Z',
      });
      expect(errorOf(reversed).code).toBe('BAD_REQUEST');
      const pdf = await admin.post('/admin/audit-logs/export', { format: 'pdf' });
      expect(errorOf(pdf).code).toBe('VALIDATION_ERROR');
    });
  });

  describe('chỉ được đọc ở tầng DB', () => {
    it('UPDATE, DELETE, TRUNCATE audit_logs đều bị chặn', async () => {
      const [log] = (await logsOf(`entityId=${targetId}`)).data;
      await expect(
        prisma.$executeRaw`UPDATE audit_logs SET action = 'user.hack' WHERE id = ${log.id}::uuid`,
      ).rejects.toThrow(/read-only/);
      await expect(
        prisma.$executeRaw`DELETE FROM audit_logs WHERE id = ${log.id}::uuid`,
      ).rejects.toThrow(/read-only/);
      await expect(prisma.$executeRaw`TRUNCATE audit_logs`).rejects.toThrow(/read-only/);
      expect((await prisma.auditLog.findUniqueOrThrow({ where: { id: log.id } })).action).toBe(
        'user.unlock',
      );
    });

    it('xóa tài khoản người thực hiện: nhật ký còn, actor = null', async () => {
      const other = await createAdmin(prisma);
      const otherAdmin = api(app, await login(app, other.email));
      const victim = (await createUser(prisma, RoleCode.STUDENT)).id;
      expect((await otherAdmin.post(`/admin/users/${victim}/lock`)).status).toBe(200);

      await prisma.user.delete({ where: { id: other.id } });

      const { data: rows } = await logsOf(`entityId=${victim}`);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ action: 'user.lock', actor: null });
    });
  });
});
