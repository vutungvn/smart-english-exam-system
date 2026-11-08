import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import {
  Difficulty,
  ExamStatus,
  QuestionStatus,
  QuestionType,
  ScoringScale,
  Skill,
} from '../src/generated/prisma/enums.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import type {
  AutoFillCoverage,
  AutoFillPreview,
} from '../src/modules/exams/auto-fill/auto-fill.types.js';
import type { ExamDetail } from '../src/modules/exams/exams.types.js';
import { api, createTestApp, createUser, data, errorOf, login } from './e2e/helpers.js';

const LEVELS = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
const OPTIONS = (n: number) => ({
  create: ['A', 'B', 'C', 'D'].slice(0, n).map((label, index) => ({
    label,
    content: `Option ${label}`,
    isCorrect: index === 0,
    orderIndex: index,
  })),
});

describe('Rút đề tự động theo ma trận (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacherId: string;
  let subjectId: string;
  let teacher: ReturnType<typeof api>;
  let otherTeacher: ReturnType<typeof api>;
  const topics = new Map<string, string>();

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const teacherUser = await createUser(prisma, RoleCode.TEACHER);
    const other = await createUser(prisma, RoleCode.TEACHER);
    teacherId = teacherUser.id;
    teacher = api(app, await login(app, teacherUser.email));
    otherTeacher = api(app, await login(app, other.email));
    const subject = await prisma.subject.findUniqueOrThrow({
      where: { code: 'TOEIC' },
      select: { id: true, topics: { select: { id: true, name: true } } },
    });
    subjectId = subject.id;
    for (const topic of subject.topics) topics.set(topic.name, topic.id);

    // Listening 2: 30 câu, mỗi mức 10 câu, chủ đề WH và Yes/No xen kẽ
    for (let i = 0; i < 30; i++) {
      await prisma.question.create({
        data: {
          topicId: topics.get(i % 2 ? 'P2 – Câu hỏi WH' : 'P2 – Yes/No & câu hỏi lựa chọn') ?? '',
          authorId: teacherId,
          type: QuestionType.SINGLE_CHOICE,
          skill: Skill.LISTENING,
          part: 2,
          difficulty: LEVELS[i % 3],
          status: QuestionStatus.ACTIVE,
          content: `E2E L2 question ${i}?`,
          explanation: 'E2E',
          options: OPTIONS(3),
        },
      });
    }
    // Reading 6: 6 nhóm 4 câu; Reading 7: đủ hồ sơ ETS (4×2, 3×3, 3×4, 5×5)
    for (let i = 0; i < 6; i++) await createGroup(Skill.READING, 6, 4, 'P6 – Chèn câu');
    for (const [size, count] of [
      [2, 4],
      [3, 3],
      [4, 3],
      [5, 5],
    ]) {
      for (let i = 0; i < count; i++) await createGroup(Skill.READING, 7, size, 'P7 – Chi tiết');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  async function createGroup(skill: Skill, part: number, size: number, topic: string) {
    await prisma.questionGroup.create({
      data: {
        topicId: topics.get(topic) ?? '',
        authorId: teacherId,
        skill,
        part,
        passage: `E2E passage ${randomUUID().slice(0, 8)}`,
        status: QuestionStatus.ACTIVE,
        questions: {
          create: Array.from({ length: size }, (_, i) => ({
            topicId: topics.get(topic) ?? '',
            authorId: teacherId,
            type: QuestionType.SINGLE_CHOICE,
            skill,
            part,
            difficulty: LEVELS[i % 3],
            status: QuestionStatus.ACTIVE,
            content: `E2E grouped question ${i + 1}`,
            explanation: 'E2E',
            orderInGroup: i + 1,
            options: OPTIONS(4),
          })),
        },
      },
    });
  }

  const createExam = async (scoringScale: ScoringScale = ScoringScale.PERCENT) =>
    (
      await prisma.exam.create({
        data: {
          authorId: teacherId,
          subjectId,
          title: `E2E auto-fill ${randomUUID().slice(0, 8)}`,
          scoringScale,
          durationMinutes: 60,
          status: ExamStatus.DRAFT,
        },
        select: { id: true },
      })
    ).id;

  const preview = (examId: string, body: object) =>
    teacher.post(`/teacher/exams/${examId}/auto-fill/preview`, body);

  /** Gửi đúng kết quả xem trước để áp dụng */
  const applyBody = (result: AutoFillPreview, updatedAt: string) => ({
    scope: result.scope,
    updatedAt,
    parts: result.parts
      .filter((part) => !part.kept)
      .map((part) => ({
        skill: part.skill,
        part: part.part,
        questionIds: part.items.flatMap((item) => (item.questionId ? [item.questionId] : [])),
        groupIds: part.items.flatMap((item) => (item.groupId ? [item.groupId] : [])),
      })),
  });

  const updatedAtOf = async (examId: string) =>
    data<ExamDetail>(await teacher.get(`/teacher/exams/${examId}`)).updatedAt as unknown as string;

  const L2 = (count: number, extra: object = {}) => ({
    skill: Skill.LISTENING,
    part: 2,
    count,
    ...extra,
  });

  it('báo ngân hàng hiện có của từng Part', async () => {
    const examId = await createExam();
    const coverage = data<AutoFillCoverage>(
      await teacher.get(`/teacher/exams/${examId}/auto-fill/coverage`),
    );
    const l2 = coverage.parts.find((p) => p.skill === Skill.LISTENING && p.part === 2);
    expect(l2).toMatchObject({
      unit: 'QUESTION',
      available: 30,
      unused: 30,
      difficulty: { easy: 10, medium: 10, hard: 10 },
      current: 0,
    });
    expect(l2?.topics.map((t) => t.name)).toContain('P2 – Câu hỏi WH');
    const r7 = coverage.parts.find((p) => p.skill === Skill.READING && p.part === 7);
    expect(r7?.sizes).toEqual([
      { size: 2, count: 4 },
      { size: 3, count: 3 },
      { size: 4, count: 3 },
      { size: 5, count: 5 },
    ]);
  });

  it('xem trước theo ma trận không ghi DB; cùng seed cùng kết quả; áp dụng ghi đúng các câu đã xem', async () => {
    const examId = await createExam();
    const body = {
      scope: 'EMPTY_PARTS',
      preferUnused: true,
      parts: [L2(10, { topics: [{ topicId: topics.get('P2 – Câu hỏi WH'), min: 6 }] })],
    };
    const res = await preview(examId, body);
    expect(res.status).toBe(200);
    const result = data<AutoFillPreview>(res);
    const [part] = result.parts;
    expect(part).toMatchObject({ selected: 10, shortage: 0, questionCount: 10 });
    expect(part.difficulty).toEqual({ easy: 3, medium: 5, hard: 2 });
    expect(part.topics.find((t) => t.name === 'P2 – Câu hỏi WH')?.count).toBeGreaterThanOrEqual(6);
    expect(await prisma.examSection.count({ where: { examId } })).toBe(0);

    const again = data<AutoFillPreview>(await preview(examId, { ...body, seed: result.seed }));
    expect(again.parts[0].items).toEqual(part.items);

    const applied = await teacher.post(
      `/teacher/exams/${examId}/auto-fill`,
      applyBody(result, await updatedAtOf(examId)),
    );
    expect(applied.status).toBe(200);
    const exam = data<ExamDetail>(applied);
    expect(exam.sections[0].questions.map((q) => q.question.id)).toEqual(
      part.items.map((item) => item.questionId),
    );
  });

  it('ưu tiên câu chưa dùng ở đề khác', async () => {
    const examId = await createExam();
    const result = data<AutoFillPreview>(
      await preview(examId, { scope: 'EMPTY_PARTS', preferUnused: true, parts: [L2(20)] }),
    );
    // Đề trước đã dùng 10/30 câu: còn đúng 20 câu chưa dùng
    expect(result.parts[0].items.every((item) => item.usedCount === 0)).toBe(true);

    const withUsed = data<AutoFillPreview>(
      await preview(examId, { scope: 'EMPTY_PARTS', preferUnused: true, parts: [L2(25)] }),
    );
    expect(withUsed.parts[0].items.filter((item) => item.usedCount > 0)).toHaveLength(5);
    expect(withUsed.parts[0].relaxed.some((note) => note.includes('đã dùng ở đề khác'))).toBe(true);
  });

  it('chỉ rút Part còn trống: Part đã có câu được giữ nguyên; nhóm câu chọn nguyên khối', async () => {
    const examId = await createExam();
    const first = data<AutoFillPreview>(
      await preview(examId, { scope: 'EMPTY_PARTS', preferUnused: false, parts: [L2(5)] }),
    );
    await teacher.post(
      `/teacher/exams/${examId}/auto-fill`,
      applyBody(first, await updatedAtOf(examId)),
    );

    const second = data<AutoFillPreview>(
      await preview(examId, {
        scope: 'EMPTY_PARTS',
        preferUnused: false,
        parts: [L2(5), { skill: Skill.READING, part: 6, count: 2 }],
      }),
    );
    expect(second.parts[0].kept).toBe(true);
    expect(second.parts[1]).toMatchObject({ unit: 'GROUP', selected: 2, questionCount: 8 });
    expect(second.totalQuestions).toBe(13);

    const exam = data<ExamDetail>(
      await teacher.post(
        `/teacher/exams/${examId}/auto-fill`,
        applyBody(second, await updatedAtOf(examId)),
      ),
    );
    expect(exam.questionCount).toBe(13);
  });

  it('đề TOEIC: Reading Part 7 đúng 54 câu theo cấu trúc ETS; Part thiếu câu được báo rõ', async () => {
    const examId = await createExam(ScoringScale.TOEIC_990);
    const result = data<AutoFillPreview>(
      await preview(examId, { scope: 'EMPTY_PARTS', preferUnused: false, parts: [] }),
    );
    expect(result.parts).toHaveLength(7);
    const r7 = result.parts.find((p) => p.skill === Skill.READING && p.part === 7);
    expect(r7).toMatchObject({ reading7Profile: true, required: 54, selected: 54, shortage: 0 });
    expect(r7?.questionCount).toBe(54);
    const r6 = result.parts.find((p) => p.skill === Skill.READING && p.part === 6);
    expect(r6).toMatchObject({ required: 4, selected: 4 });
    const l1 = result.parts.find((p) => p.skill === Skill.LISTENING && p.part === 1);
    expect(l1).toMatchObject({ required: 6, selected: 0, shortage: 6 });
  });

  it('kiểm tra ma trận: tổng tỉ lệ, chủ đề sai Part, số lượng với đề TOEIC', async () => {
    const percent = await createExam();
    const ratio = await preview(percent, {
      scope: 'EMPTY_PARTS',
      preferUnused: false,
      parts: [L2(5, { difficulty: { easy: 50, medium: 30, hard: 30 } })],
    });
    expect(ratio.status).toBe(400);
    expect(errorOf(ratio).details).toEqual([
      { field: 'parts[0].difficulty', message: 'Tổng tỉ lệ độ khó phải bằng 100%' },
    ]);

    const wrongTopic = await preview(percent, {
      scope: 'EMPTY_PARTS',
      preferUnused: false,
      parts: [L2(5, { topics: [{ topicId: topics.get('P7 – Chi tiết'), min: 2 }] })],
    });
    expect(wrongTopic.status).toBe(400);

    const missingCount = await preview(percent, {
      scope: 'EMPTY_PARTS',
      preferUnused: false,
      parts: [{ skill: Skill.LISTENING, part: 2 }],
    });
    expect(missingCount.status).toBe(400);

    const toeic = await createExam(ScoringScale.TOEIC_990);
    const withCount = await preview(toeic, {
      scope: 'EMPTY_PARTS',
      preferUnused: false,
      parts: [L2(5)],
    });
    expect(withCount.status).toBe(400);
  });

  it('áp dụng: đề đổi sau lúc xem trước → 409; câu bị ngừng dùng → 400 và đề giữ nguyên', async () => {
    const examId = await createExam();
    const result = data<AutoFillPreview>(
      await preview(examId, { scope: 'EMPTY_PARTS', preferUnused: false, parts: [L2(3)] }),
    );

    const stale = await teacher.post(
      `/teacher/exams/${examId}/auto-fill`,
      applyBody(result, new Date(Date.now() - 60_000).toISOString()),
    );
    expect(stale.status).toBe(409);
    expect(errorOf(stale).code).toBe('VERSION_CONFLICT');

    const [first] = result.parts[0].items;
    await prisma.question.update({
      where: { id: first.questionId ?? '' },
      data: { status: QuestionStatus.INACTIVE },
    });
    const inactive = await teacher.post(
      `/teacher/exams/${examId}/auto-fill`,
      applyBody(result, await updatedAtOf(examId)),
    );
    expect(inactive.status).toBe(400);
    expect(await prisma.examSection.count({ where: { examId } })).toBe(0);
    await prisma.question.update({
      where: { id: first.questionId ?? '' },
      data: { status: QuestionStatus.ACTIVE },
    });
  });

  it('rút lại cả đề thay toàn bộ câu cũ; đề đã xuất bản hoặc của giáo viên khác bị chặn', async () => {
    const examId = await createExam();
    const first = data<AutoFillPreview>(
      await preview(examId, { scope: 'EMPTY_PARTS', preferUnused: false, parts: [L2(5)] }),
    );
    await teacher.post(
      `/teacher/exams/${examId}/auto-fill`,
      applyBody(first, await updatedAtOf(examId)),
    );

    const all = data<AutoFillPreview>(
      await preview(examId, { scope: 'ALL', preferUnused: false, parts: [L2(8)] }),
    );
    expect(all.parts[0].kept).toBe(false);
    const exam = data<ExamDetail>(
      await teacher.post(
        `/teacher/exams/${examId}/auto-fill`,
        applyBody(all, await updatedAtOf(examId)),
      ),
    );
    expect(exam.questionCount).toBe(8);

    expect(
      (
        await otherTeacher.post(`/teacher/exams/${examId}/auto-fill/preview`, {
          scope: 'ALL',
          preferUnused: false,
          parts: [L2(5)],
        })
      ).status,
    ).toBe(404);

    await prisma.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.PUBLISHED, publishedAt: new Date() },
    });
    const published = await preview(examId, { scope: 'ALL', preferUnused: false, parts: [L2(5)] });
    expect(published.status).toBe(409);
    expect(errorOf(published).code).toBe('EXAM_PUBLISHED');
  });
});
