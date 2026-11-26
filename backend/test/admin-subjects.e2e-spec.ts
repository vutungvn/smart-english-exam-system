import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import {
  Difficulty,
  QuestionStatus,
  QuestionType,
  ScoringScale,
  Skill,
} from '../src/generated/prisma/enums.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import type {
  AdminSubjectItem,
  AdminTopicItem,
} from '../src/modules/subjects/admin-subjects.types.js';
import {
  api,
  createAdmin,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
} from './e2e/helpers.js';

describe('Chương trình thi, chủ đề /admin/subjects (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminId: string;
  let teacherId: string;
  let admin: ReturnType<typeof api>;
  let teacher: ReturnType<typeof api>;
  let student: ReturnType<typeof api>;
  let toeic: AdminSubjectItem;
  // Mã riêng mỗi lần chạy để chạy lại không trùng
  const code = () => `E2E_${randomUUID().slice(0, 8).toUpperCase()}`;

  const createSubject = async (category: 'TOEIC' | 'IELTS' = 'TOEIC') => {
    const res = await admin.post('/admin/subjects', {
      code: code(),
      name: 'Chương trình E2E',
      category,
    });
    expect(res.status).toBe(201);
    return data<AdminSubjectItem>(res);
  };
  const createTopic = async (subjectId: string, body: object) => {
    const res = await admin.post(`/admin/subjects/${subjectId}/topics`, {
      name: `Chủ đề ${randomUUID().slice(0, 6)}`,
      skill: Skill.READING,
      parts: [5, 6],
      ...body,
    });
    expect(res.status).toBe(201);
    return data<AdminTopicItem>(res);
  };
  /** Câu Reading của chủ đề; deleted: câu đã xóa mềm */
  const addQuestion = (topicId: string, part = 5, deleted = false) =>
    prisma.question.create({
      data: {
        topicId,
        authorId: teacherId,
        type: QuestionType.SINGLE_CHOICE,
        skill: Skill.READING,
        part,
        difficulty: Difficulty.EASY,
        status: QuestionStatus.ACTIVE,
        content: 'E2E: The report ------- ready.',
        deletedAt: deleted ? new Date() : null,
      },
    });
  const lastLog = (action: string) =>
    prisma.auditLog.findFirstOrThrow({
      where: { actorId: adminId, action },
      orderBy: { createdAt: 'desc' },
    });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const adminUser = await createAdmin(prisma);
    adminId = adminUser.id;
    admin = api(app, await login(app, adminUser.email));
    const teacherUser = await createUser(prisma, RoleCode.TEACHER);
    teacherId = teacherUser.id;
    teacher = api(app, await login(app, teacherUser.email));
    student = api(app, await login(app, (await createUser(prisma, RoleCode.STUDENT)).email));
    const list = data<AdminSubjectItem[]>(await admin.get('/admin/subjects'));
    toeic = list.find((subject) => subject.code === 'TOEIC') as AdminSubjectItem;
  });

  afterAll(async () => {
    await app.close();
  });

  it('học viên, giáo viên → 403; khách → 401', async () => {
    const id = toeic.id;
    for (const [client, status] of [
      [student, 403],
      [teacher, 403],
      [api(app), 401],
    ] as const) {
      const responses = await Promise.all([
        client.get('/admin/subjects'),
        client.get(`/admin/subjects/${id}`),
        client.post('/admin/subjects', {}),
        client.patch(`/admin/subjects/${id}`, {}),
        client.delete(`/admin/subjects/${id}`),
        client.get(`/admin/subjects/${id}/topics`),
        client.post(`/admin/subjects/${id}/topics`, {}),
        client.patch(`/admin/subjects/${id}/topics/${randomUUID()}`, {}),
        client.delete(`/admin/subjects/${id}/topics/${randomUUID()}`),
      ]);
      expect(responses.map((res) => res.status)).toEqual(Array(9).fill(status));
    }
  });

  describe('chương trình thi', () => {
    it('danh sách có TOEIC là chương trình hệ thống, kèm số liệu', () => {
      expect(toeic).toMatchObject({ isActive: true, isProtected: true, category: 'TOEIC' });
      expect(toeic.topicCount).toBeGreaterThanOrEqual(29);
    });

    it('thêm: mã viết thường được đổi sang chữ hoa; trùng mã → 409; mã sai → 400', async () => {
      const lower = `e2e_${randomUUID().slice(0, 8)}`;
      const res = await admin.post('/admin/subjects', {
        code: lower,
        name: ' IELTS E2E ',
        category: 'IELTS',
      });
      expect(res.status).toBe(201);
      const created = data<AdminSubjectItem>(res);
      expect(created).toMatchObject({
        code: lower.toUpperCase(),
        name: 'IELTS E2E',
        isActive: true,
        isProtected: false,
        topicCount: 0,
        examCount: 0,
        questionCount: 0,
      });
      expect(await lastLog('subject.create')).toMatchObject({
        entityId: created.id,
        after: { code: lower.toUpperCase(), category: 'IELTS' },
      });

      const duplicate = await admin.post('/admin/subjects', {
        code: lower,
        name: 'Trùng',
        category: 'TOEIC',
      });
      expect(duplicate.status).toBe(409);
      expect(errorOf(duplicate).code).toBe('SUBJECT_CODE_EXISTS');

      for (const bad of ['A', 'IELTS ACADEMIC', 'TOEIC-2']) {
        const invalid = await admin.post('/admin/subjects', {
          code: bad,
          name: 'Sai',
          category: 'TOEIC',
        });
        expect(invalid.status).toBe(400);
      }
    });

    it('sửa tên, ẩn: biến mất khỏi danh sách công khai, không tạo đề được; mã không sửa được', async () => {
      const subject = await createSubject();
      const res = await admin.patch(`/admin/subjects/${subject.id}`, {
        name: 'Đổi tên',
        isActive: false,
        updatedAt: subject.updatedAt,
      });
      expect(res.status).toBe(200);
      expect(data<AdminSubjectItem>(res)).toMatchObject({ name: 'Đổi tên', isActive: false });
      expect(await lastLog('subject.update')).toMatchObject({
        entityId: subject.id,
        before: { name: 'Chương trình E2E', isActive: true },
        after: { name: 'Đổi tên', isActive: false },
      });

      const publicList = data<{ id: string }[]>(await api(app).get('/subjects'));
      expect(publicList.some((item) => item.id === subject.id)).toBe(false);
      const exam = await teacher.post('/teacher/exams', {
        subjectId: subject.id,
        title: 'Đề E2E',
        scoringScale: ScoringScale.PERCENT,
        durationMinutes: 10,
      });
      expect(exam.status).toBe(400);

      const withCode = await admin.patch(`/admin/subjects/${subject.id}`, {
        code: 'HACK',
        updatedAt: data<AdminSubjectItem>(res).updatedAt,
      });
      expect(withCode.status).toBe(400);
    });

    it('updatedAt cũ → 409 VERSION_CONFLICT', async () => {
      const subject = await createSubject();
      const send = (name: string) =>
        admin.patch(`/admin/subjects/${subject.id}`, { name, updatedAt: subject.updatedAt });
      expect((await send('Lần 1')).status).toBe(200);
      const conflict = await send('Lần 2');
      expect(conflict.status).toBe(409);
      expect(errorOf(conflict).code).toBe('VERSION_CONFLICT');
    });

    it('TOEIC: không ẩn, không xóa được; vẫn sửa tên được', async () => {
      const hide = await admin.patch(`/admin/subjects/${toeic.id}`, {
        isActive: false,
        updatedAt: toeic.updatedAt,
      });
      expect(hide.status).toBe(409);
      expect(errorOf(hide).code).toBe('SUBJECT_PROTECTED');
      const remove = await admin.delete(`/admin/subjects/${toeic.id}`);
      expect(errorOf(remove).code).toBe('SUBJECT_PROTECTED');

      const rename = await admin.patch(`/admin/subjects/${toeic.id}`, {
        name: toeic.name,
        updatedAt: toeic.updatedAt,
      });
      expect(rename.status).toBe(200);
      toeic = data<AdminSubjectItem>(rename);
    });

    it('xóa: được khi chưa dùng (chủ đề xóa theo); có câu hỏi kể cả đã xóa mềm → 409', async () => {
      const empty = await createSubject();
      const topic = await createTopic(empty.id, {});
      const res = await admin.delete(`/admin/subjects/${empty.id}`);
      expect(res.status).toBe(200);
      expect(await prisma.topic.count({ where: { id: topic.id } })).toBe(0);
      expect(await lastLog('subject.delete')).toMatchObject({ entityId: empty.id });
      expect((await admin.get(`/admin/subjects/${empty.id}`)).status).toBe(404);

      const used = await createSubject();
      const usedTopic = await createTopic(used.id, {});
      await addQuestion(usedTopic.id, 5, true);
      const blocked = await admin.delete(`/admin/subjects/${used.id}`);
      expect(blocked.status).toBe(409);
      expect(errorOf(blocked)).toMatchObject({
        code: 'SUBJECT_IN_USE',
        details: { exams: 0, questions: 1, groups: 0 },
      });
    });

    it('id lạ → 404 SUBJECT_NOT_FOUND', async () => {
      for (const id of [randomUUID(), 'abc']) {
        expect(errorOf(await admin.get(`/admin/subjects/${id}`)).code).toBe('SUBJECT_NOT_FOUND');
      }
    });
  });

  describe('chủ đề', () => {
    it('thêm: Part phải thuộc kỹ năng, bỏ trùng, sắp tăng dần; tên trùng → 409', async () => {
      const subject = await createSubject();
      const topic = await createTopic(subject.id, {
        name: 'Câu điều kiện',
        skill: Skill.READING,
        parts: [6, 5, 6],
        description: 'Ngữ pháp',
      });
      expect(topic).toMatchObject({
        name: 'Câu điều kiện',
        parts: [5, 6],
        questionCount: 0,
        groupCount: 0,
      });
      expect(await lastLog('topic.create')).toMatchObject({
        entityId: topic.id,
        meta: { subject: subject.code },
      });

      const wrongPart = await admin.post(`/admin/subjects/${subject.id}/topics`, {
        name: 'Sai Part',
        skill: Skill.SPEAKING,
        parts: [6],
      });
      expect(wrongPart.status).toBe(400);
      expect(errorOf(wrongPart).details).toEqual([
        { field: 'parts', message: 'Part 6 không thuộc SPEAKING; dùng được: 1, 2, 3, 4, 5' },
      ]);
      const empty = await admin.post(`/admin/subjects/${subject.id}/topics`, {
        name: 'Không Part',
        skill: Skill.READING,
        parts: [],
      });
      expect(empty.status).toBe(400);

      const duplicate = await admin.post(`/admin/subjects/${subject.id}/topics`, {
        name: 'Câu điều kiện',
        skill: Skill.READING,
        parts: [5],
      });
      expect(errorOf(duplicate).code).toBe('TOPIC_NAME_EXISTS');
    });

    it('chương trình IELTS chưa thêm chủ đề được → 422', async () => {
      const ielts = await createSubject('IELTS');
      const res = await admin.post(`/admin/subjects/${ielts.id}/topics`, {
        name: 'Reading',
        skill: Skill.READING,
        parts: [5],
      });
      expect(res.status).toBe(422);
      expect(errorOf(res).code).toBe('TOPICS_NOT_SUPPORTED');
    });

    it('danh sách kèm số câu hỏi (không tính câu đã xóa), lọc theo kỹ năng', async () => {
      const subject = await createSubject();
      const reading = await createTopic(subject.id, {});
      await createTopic(subject.id, { skill: Skill.WRITING, parts: [3] });
      await addQuestion(reading.id);
      await addQuestion(reading.id, 5, true);

      const all = data<AdminTopicItem[]>(await admin.get(`/admin/subjects/${subject.id}/topics`));
      expect(all.map((topic) => topic.skill)).toEqual([Skill.READING, Skill.WRITING]);
      expect(all[0]).toMatchObject({ id: reading.id, questionCount: 1 });
      const writing = data<AdminTopicItem[]>(
        await admin.get(`/admin/subjects/${subject.id}/topics?skill=WRITING`),
      );
      expect(writing).toHaveLength(1);
      const stats = data<AdminSubjectItem>(await admin.get(`/admin/subjects/${subject.id}`));
      expect(stats).toMatchObject({ topicCount: 2, questionCount: 1 });
    });

    it('sửa: đổi tên, thêm Part được; bỏ Part, đổi kỹ năng khi đang dùng → 409', async () => {
      const subject = await createSubject();
      const topic = await createTopic(subject.id, { parts: [5] });
      await addQuestion(topic.id, 5);

      const renamed = await admin.patch(`/admin/subjects/${subject.id}/topics/${topic.id}`, {
        name: 'Tên mới',
        parts: [6, 5],
        updatedAt: topic.updatedAt,
      });
      expect(renamed.status).toBe(200);
      const updated = data<AdminTopicItem>(renamed);
      expect(updated).toMatchObject({ name: 'Tên mới', parts: [5, 6], questionCount: 1 });
      expect(await lastLog('topic.update')).toMatchObject({
        entityId: topic.id,
        before: { name: topic.name, parts: [5] },
        after: { name: 'Tên mới', parts: [5, 6] },
      });

      const dropPart = await admin.patch(`/admin/subjects/${subject.id}/topics/${topic.id}`, {
        parts: [6],
        updatedAt: updated.updatedAt,
      });
      expect(dropPart.status).toBe(409);
      expect(errorOf(dropPart)).toMatchObject({
        code: 'TOPIC_IN_USE',
        details: { parts: [5], questions: 1, groups: 0 },
      });
      // Bỏ Part không có câu nào dùng thì được
      const dropUnused = await admin.patch(`/admin/subjects/${subject.id}/topics/${topic.id}`, {
        parts: [5],
        updatedAt: updated.updatedAt,
      });
      expect(dropUnused.status).toBe(200);

      const changeSkill = await admin.patch(`/admin/subjects/${subject.id}/topics/${topic.id}`, {
        skill: Skill.WRITING,
        parts: [1],
        updatedAt: data<AdminTopicItem>(dropUnused).updatedAt,
      });
      expect(errorOf(changeSkill).code).toBe('TOPIC_IN_USE');
    });

    it('sửa: đổi kỹ năng khi chưa dùng được; Part cũ không hợp kỹ năng mới → 400; updatedAt cũ → 409', async () => {
      const subject = await createSubject();
      const topic = await createTopic(subject.id, { parts: [5] });
      const mismatch = await admin.patch(`/admin/subjects/${subject.id}/topics/${topic.id}`, {
        skill: Skill.WRITING,
        updatedAt: topic.updatedAt,
      });
      expect(mismatch.status).toBe(400);

      const ok = await admin.patch(`/admin/subjects/${subject.id}/topics/${topic.id}`, {
        skill: Skill.WRITING,
        parts: [2],
        description: null,
        updatedAt: topic.updatedAt,
      });
      expect(ok.status).toBe(200);
      expect(data<AdminTopicItem>(ok)).toMatchObject({ skill: 'WRITING', parts: [2] });

      const conflict = await admin.patch(`/admin/subjects/${subject.id}/topics/${topic.id}`, {
        name: 'Cũ',
        updatedAt: topic.updatedAt,
      });
      expect(errorOf(conflict).code).toBe('VERSION_CONFLICT');
    });

    it('chủ đề có sẵn từ migration sửa được ngay (updated_at đúng mili giây)', async () => {
      const [topic] = data<AdminTopicItem[]>(
        await admin.get(`/admin/subjects/${toeic.id}/topics?skill=WRITING`),
      );
      const res = await admin.patch(`/admin/subjects/${toeic.id}/topics/${topic.id}`, {
        description: topic.description,
        updatedAt: topic.updatedAt,
      });
      expect(res.status).toBe(200);
    });

    it('xóa: được khi chưa dùng; chỉ còn câu đã xóa mềm vẫn → 409; sai chương trình → 404', async () => {
      const subject = await createSubject();
      const unused = await createTopic(subject.id, {});
      const res = await admin.delete(`/admin/subjects/${subject.id}/topics/${unused.id}`);
      expect(res.status).toBe(200);
      expect(await lastLog('topic.delete')).toMatchObject({
        entityId: unused.id,
        before: { name: unused.name },
      });

      const used = await createTopic(subject.id, {});
      await addQuestion(used.id, 5, true);
      const blocked = await admin.delete(`/admin/subjects/${subject.id}/topics/${used.id}`);
      expect(blocked.status).toBe(409);
      expect(errorOf(blocked)).toMatchObject({
        code: 'TOPIC_IN_USE',
        details: { questions: 1, groups: 0 },
      });

      const other = await admin.delete(`/admin/subjects/${toeic.id}/topics/${used.id}`);
      expect(other.status).toBe(404);
      expect(errorOf(other).code).toBe('TOPIC_NOT_FOUND');
    });
  });
});
