import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { SETTING_DEFAULTS } from '../src/infra/settings/settings.schema.js';
import type { AiQuotas } from '../src/modules/ai-explanations/ai-explanations.types.js';
import type {
  AdminSettings,
  PublicSettings,
  RecordingImpact,
} from '../src/modules/settings/settings.types.js';
import {
  api,
  createAdmin,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
} from './e2e/helpers.js';

describe('Cấu hình hệ thống /admin/settings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminId: string;
  let admin: ReturnType<typeof api>;
  let student: ReturnType<typeof api>;

  const resetAll = async () => {
    await prisma.systemSetting.updateMany({ data: { value: {}, updatedById: null } });
  };
  const current = async () => data<AdminSettings>(await admin.get('/admin/settings'));
  const lastLog = () =>
    prisma.auditLog.findFirstOrThrow({
      where: { actorId: adminId, entity: 'setting' },
      orderBy: { createdAt: 'desc' },
    });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const adminUser = await createAdmin(prisma);
    adminId = adminUser.id;
    admin = api(app, await login(app, adminUser.email));
    student = api(app, await login(app, (await createUser(prisma, RoleCode.STUDENT)).email));
  });

  // Các tệp e2e dùng chung DB: luôn trả về mặc định
  afterAll(async () => {
    await resetAll();
    await app.close();
  });

  it('dòng migration tạo sẵn sửa được ngay (updated_at đúng mili giây)', async () => {
    const { recording } = await current();
    expect(recording).toMatchObject({
      values: { retentionDays: 30 },
      isDefault: true,
      updatedBy: null,
      ranges: { retentionDays: { min: 7, max: 30 } },
    });
    const res = await admin.patch('/admin/settings/recording', {
      retentionDays: 29,
      updatedAt: recording.updatedAt,
    });
    expect(res.status).toBe(200);
  });

  describe('mỗi test bắt đầu từ mặc định', () => {
    beforeEach(resetAll);

    it('học viên → 403, khách → 401', async () => {
      const body = { updatedAt: new Date().toISOString() };
      for (const [client, status] of [
        [student, 403],
        [api(app), 401],
      ] as const) {
        const responses = await Promise.all([
          client.get('/admin/settings'),
          client.get('/admin/settings/recording/impact?retentionDays=7'),
          client.patch('/admin/settings/scoring', body),
          client.patch('/admin/settings/ai', body),
          client.patch('/admin/settings/recording', body),
          client.post('/admin/settings/ai/reset', body),
        ]);
        expect(responses.map((res) => res.status)).toEqual(Array(6).fill(status));
      }
    });

    it('số ngày giữ ghi âm đọc công khai được, theo giá trị admin vừa sửa', async () => {
      const publicSettings = async () =>
        data<PublicSettings>(await api(app).get('/settings/public'));
      expect(await publicSettings()).toEqual({ recordingRetentionDays: 30 });

      const { recording } = await current();
      await admin.patch('/admin/settings/recording', {
        retentionDays: 14,
        updatedAt: recording.updatedAt,
      });
      expect(await publicSettings()).toEqual({ recordingRetentionDays: 14 });
    });

    it('sửa hạn mức AI: có hiệu lực ngay với học viên, ghi nhật ký giá trị cũ và mới', async () => {
      const { ai } = await current();
      const res = await admin.patch('/admin/settings/ai', {
        dailyBudget: 1000,
        explainDailyLimit: 3,
        updatedAt: ai.updatedAt,
      });
      expect(res.status).toBe(200);
      expect(data<AdminSettings>(res).ai).toMatchObject({
        values: { dailyBudget: 1000, explainDailyLimit: 3 },
        defaults: SETTING_DEFAULTS.ai,
        isDefault: false,
        updatedBy: { id: adminId },
      });

      const quotas = data<AiQuotas>(await student.get('/me/ai-quotas'));
      expect(quotas.explanation.limit).toBe(3);

      expect(await lastLog()).toMatchObject({
        action: 'setting.update',
        before: { explainDailyLimit: 20 },
        after: { explainDailyLimit: 3 },
        meta: { group: 'ai' },
      });
    });

    it('sửa bảng quy đổi: nhật ký chỉ ghi bảng đã đổi, dạng rút gọn', async () => {
      const { scoring } = await current();
      const writing = [
        { raw: 0, score: 0 },
        { raw: 100, score: 200 },
      ];
      const res = await admin.patch('/admin/settings/scoring', {
        ...scoring.values,
        writing,
        updatedAt: scoring.updatedAt,
      });
      expect(res.status).toBe(200);
      expect(data<AdminSettings>(res).scoring.values).toEqual({
        ...SETTING_DEFAULTS.scoring,
        writing,
      });
      expect((await lastLog()).after).toEqual({ writing: '0→0, 100→200' });
    });

    it('giá trị sai → 400 kèm trường lỗi, không lưu phần nào', async () => {
      const { scoring, ai, recording } = await current();
      const aiBody = (dailyBudget: number, explainDailyLimit: number) => ({
        dailyBudget,
        explainDailyLimit,
        updatedAt: ai.updatedAt,
      });
      const cases: [group: string, body: object, field: string][] = [
        ['ai', aiBody(10, 11), 'explainDailyLimit'],
        ['ai', aiBody(1.5, 1), 'dailyBudget'],
        ['recording', { retentionDays: 31, updatedAt: recording.updatedAt }, 'retentionDays'],
        [
          'scoring',
          {
            ...scoring.values,
            listening: [
              { raw: 0, score: 5 },
              { raw: 50, score: 252 },
              { raw: 100, score: 495 },
            ],
            updatedAt: scoring.updatedAt,
          },
          'listening.1.score',
        ],
        [
          'scoring',
          { ...scoring.values, reading: [{ raw: 'x', score: 5 }], updatedAt: scoring.updatedAt },
          'reading.0.raw',
        ],
        [
          'scoring',
          { ...scoring.values, reading: [null, null], updatedAt: scoring.updatedAt },
          'reading.0',
        ],
      ];
      for (const [group, body, field] of cases) {
        const res = await admin.patch(`/admin/settings/${group}`, body);
        expect(res.status).toBe(400);
        expect(errorOf(res).code).toBe('VALIDATION_ERROR');
        const fields = (errorOf(res).details as { field: string }[]).map((item) => item.field);
        expect(fields).toContain(field);
      }
      const after = await current();
      expect([after.scoring, after.ai, after.recording].map((g) => g.isDefault)).toEqual([
        true,
        true,
        true,
      ]);
    });

    it('updatedAt cũ → 409 VERSION_CONFLICT, không ghi đè', async () => {
      const { recording } = await current();
      const send = (retentionDays: number) =>
        admin.patch('/admin/settings/recording', { retentionDays, updatedAt: recording.updatedAt });
      expect((await send(20)).status).toBe(200);
      const conflict = await send(10);
      expect(conflict.status).toBe(409);
      expect(errorOf(conflict).code).toBe('VERSION_CONFLICT');
      expect((await current()).recording.values.retentionDays).toBe(20);
    });

    it('khôi phục mặc định một nhóm; nhóm lạ → 404', async () => {
      const { recording } = await current();
      const changed = data<AdminSettings>(
        await admin.patch('/admin/settings/recording', {
          retentionDays: 14,
          updatedAt: recording.updatedAt,
        }),
      ).recording;

      const res = await admin.post('/admin/settings/recording/reset', {
        updatedAt: changed.updatedAt,
      });
      expect(res.status).toBe(200);
      expect(data<AdminSettings>(res).recording).toMatchObject({
        values: SETTING_DEFAULTS.recording,
        isDefault: true,
        updatedBy: { id: adminId },
      });
      expect(await lastLog()).toMatchObject({
        action: 'setting.reset',
        before: { retentionDays: 14 },
        after: { retentionDays: 30 },
        meta: { group: 'recording' },
      });

      const unknown = await admin.post('/admin/settings/abc/reset', {
        updatedAt: changed.updatedAt,
      });
      expect(unknown.status).toBe(404);
      expect(errorOf(unknown).code).toBe('SETTING_GROUP_NOT_FOUND');
    });

    it('đếm bản ghi âm sẽ bị xóa; số ngày ngoài 7–30 → 400', async () => {
      const impact = async (days: number) => {
        const res = await admin.get(`/admin/settings/recording/impact?retentionDays=${days}`);
        expect(res.status).toBe(200);
        return data<RecordingImpact>(res).recordingCount;
      };
      // Giữ ít ngày hơn thì không thể xóa ít bản ghi hơn
      expect(await impact(7)).toBeGreaterThanOrEqual(await impact(30));
      for (const days of ['6', '31', 'abc', '']) {
        const res = await admin.get(`/admin/settings/recording/impact?retentionDays=${days}`);
        expect(res.status).toBe(400);
      }
    });
  });
});
