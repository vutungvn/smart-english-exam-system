import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import type { AttemptDetail, AttemptReview } from '../src/modules/attempts/attempts.types.js';
import type { ExamDetail } from '../src/modules/exams/exams.types.js';
import { api, createExam, createTestApp, createUser, data, errorOf, login } from './e2e/helpers.js';

/** Thứ tự câu (examQuestionId) và số câu học viên thấy */
const paperOrder = (attempt: AttemptDetail) =>
  attempt.paper.sections.flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.questions.map((q) => ({ id: q.examQuestionId, number: q.number })),
    ),
  );

describe('Đảo câu theo lượt làm bài (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacherId: string;
  let teacher: ReturnType<typeof api>;
  let studentA: ReturnType<typeof api>;
  let studentB: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const teacherUser = await createUser(prisma, RoleCode.TEACHER);
    const a = await createUser(prisma, RoleCode.STUDENT);
    const b = await createUser(prisma, RoleCode.STUDENT);
    teacherId = teacherUser.id;
    teacher = api(app, await login(app, teacherUser.email));
    studentA = api(app, await login(app, a.email));
    studentB = api(app, await login(app, b.email));
  });

  afterAll(async () => {
    await app.close();
  });

  const start = async (by: ReturnType<typeof api>, examId: string) =>
    data<AttemptDetail>(await by.post(`/exams/${examId}/attempts`, { mode: 'FULL' }));

  it('mỗi học viên một thứ tự riêng; vào lại và trang xem lại giữ đúng thứ tự đó', async () => {
    // 8 câu: xác suất hai lượt trùng thứ tự là 1/40320
    const exam = await createExam(prisma, teacherId, { questionCount: 8, shuffleQuestions: true });
    const original = exam.questions.map((q) => q.examQuestionId);

    const a = await start(studentA, exam.examId);
    const b = await start(studentB, exam.examId);
    const orderA = paperOrder(a);
    const orderB = paperOrder(b);

    expect(orderA.map((q) => q.id)).not.toEqual(orderB.map((q) => q.id));
    expect([...orderA.map((q) => q.id)].sort()).toEqual([...original].sort());
    // Đánh số lại theo thứ tự mới: luôn là 1…8
    expect(orderA.map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    // Thoát rồi vào lại: đúng thứ tự cũ
    const resumed = data<AttemptDetail>(await studentA.get(`/attempts/${a.id}`));
    expect(paperOrder(resumed)).toEqual(orderA);

    // Xem lại sau khi nộp: cùng thứ tự, cùng số câu như lúc làm bài
    await studentA.post(`/attempts/${a.id}/submit`);
    const review = data<AttemptReview>(await studentA.get(`/attempts/${a.id}/review`));
    const reviewOrder = review.sections.flatMap((section) =>
      section.blocks.flatMap((block) =>
        block.questions.map((q) => ({ id: q.examQuestionId, number: q.number })),
      ),
    );
    expect(reviewOrder).toEqual(orderA);
  });

  it('đề tắt đảo câu: mọi học viên thấy đúng thứ tự giáo viên soạn', async () => {
    const exam = await createExam(prisma, teacherId, { questionCount: 6, shuffleQuestions: false });
    const original = exam.questions.map((q) => q.examQuestionId);

    for (const student of [studentA, studentB]) {
      const attempt = await start(student, exam.examId);
      expect(paperOrder(attempt).map((q) => q.id)).toEqual(original);
    }
  });

  it('đề đang xuất bản thì không đổi được cài đặt đảo câu', async () => {
    const exam = await createExam(prisma, teacherId, { shuffleQuestions: true });
    const detail = data<ExamDetail>(await teacher.get(`/teacher/exams/${exam.examId}`));
    expect(detail.shuffleQuestions).toBe(true);

    const res = await teacher.patch(`/teacher/exams/${exam.examId}`, {
      shuffleQuestions: false,
      updatedAt: detail.updatedAt,
    });
    expect(res.status).toBe(400);
    expect(errorOf(res).code).toBe('VALIDATION_ERROR');
  });
});
