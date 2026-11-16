import { setTimeout as sleep } from 'node:timers/promises';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import { AssessmentStatus } from '../src/generated/prisma/enums.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import type { QuestionAssessment } from '../src/modules/assessments/assessments.types.js';
import type {
  AttemptDetail,
  AttemptResult,
  AttemptReview,
  ReviewQuestion,
} from '../src/modules/attempts/attempts.types.js';
import {
  api,
  createTestApp,
  createUser,
  createWritingExam,
  data,
  errorOf,
  login,
  type WritingExamFixture,
} from './e2e/helpers.js';

/** Đủ dài để FakeAi cho điểm tối đa của từng Part (8, 60, 250 từ) */
const FULL_ANSWERS = [
  'A man is riding his bicycle along the river in the park today.',
  'Dear Manager, '.concat('thank you for the e-mail about the new classes. '.repeat(10)),
  'I strongly agree that employees should work from home. '.repeat(30),
];

describe('Chấm Writing bằng AI (e2e, FakeAiProvider)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacherId: string;
  let student: ReturnType<typeof api>;
  let otherStudent: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    teacherId = (await createUser(prisma, RoleCode.TEACHER)).id;
    student = api(app, await login(app, (await createUser(prisma, RoleCode.STUDENT)).email));
    otherStudent = api(app, await login(app, (await createUser(prisma, RoleCode.STUDENT)).email));
  });

  afterAll(async () => {
    await app.close();
  });

  /** Bắt đầu làm cả đề (hoặc một Part), viết bài theo thứ tự câu; null/'' là bỏ trống */
  async function startAndWrite(
    exam: WritingExamFixture,
    answers: (string | null)[],
    sectionId?: string,
  ): Promise<string> {
    const started = await student.post(
      `/exams/${exam.examId}/attempts`,
      sectionId ? { mode: 'PART', sectionId } : { mode: 'FULL' },
    );
    expect(started.status).toBe(201);
    const attempt = data<AttemptDetail>(started);
    const ids = attempt.paper.sections.flatMap((section) =>
      section.blocks.flatMap((block) => block.questions.map((q) => q.examQuestionId)),
    );
    for (const [index, text] of answers.entries()) {
      if (text === null) continue;
      const saved = await student.put(`/attempts/${attempt.id}/answers/${ids[index]}`, {
        textAnswer: text,
        answeredAt: new Date().toISOString(),
      });
      expect(saved.status).toBe(200);
    }
    return attempt.id;
  }

  async function submit(attemptId: string): Promise<AttemptResult> {
    const res = await student.post(`/attempts/${attemptId}/submit`);
    expect(res.status).toBe(200);
    return data<AttemptResult>(res);
  }

  /** Hỏi lại kết quả tới khi thỏa điều kiện (worker chấm chạy nền) */
  async function waitForResult(
    attemptId: string,
    done: (result: AttemptResult) => boolean,
    timeoutMs = 25_000,
  ): Promise<AttemptResult> {
    const until = Date.now() + timeoutMs;
    for (;;) {
      const result = data<AttemptDetail>(await student.get(`/attempts/${attemptId}`))
        .result as AttemptResult;
      if (done(result)) return result;
      if (Date.now() > until) throw new Error(`Hết thời gian chờ chấm: ${JSON.stringify(result)}`);
      await sleep(300);
    }
  }

  async function reviewQuestions(attemptId: string): Promise<ReviewQuestion[]> {
    const review = data<AttemptReview>(await student.get(`/attempts/${attemptId}/review`));
    return review.sections.flatMap((section) => section.blocks.flatMap((block) => block.questions));
  }

  it('nộp đề Writing: chờ chấm (SUBMITTED) → AI chấm từng câu → GRADED, điểm 0–200', async () => {
    const exam = await createWritingExam(prisma, teacherId);
    const attemptId = await startAndWrite(exam, FULL_ANSWERS);

    const submitted = await submit(attemptId);
    expect(submitted).toMatchObject({
      status: 'SUBMITTED',
      scoring: 'TOEIC_SW',
      scaledScore: null,
    });
    expect(submitted.pendingOpenCount).toBe(3);
    expect(submitted.grading?.total).toBe(3);

    const graded = await waitForResult(attemptId, (result) => result.status === 'GRADED');
    // Bài đủ dài: FakeAi cho điểm tối đa mọi câu → 12/12 → 200
    expect(graded).toMatchObject({ scaledScore: 200, pendingOpenCount: 0 });
    expect(graded.grading).toMatchObject({ total: 3, done: 3, pending: 0, failed: 0 });
    expect(graded.skillScores[0]).toMatchObject({
      skill: 'WRITING',
      openMax: 12,
      openRaw: 12,
      scaled: 200,
    });

    const questions = await reviewQuestions(attemptId);
    expect(questions.map((q) => q.outcome)).toEqual(['SCORED', 'SCORED', 'SCORED']);
    const first = questions[0].assessment as QuestionAssessment;
    expect(first).toMatchObject({ status: 'DONE', score: 3, maxScore: 3, regradesLeft: 2 });
    expect(first.criteria.map((c) => c.key)).toEqual([
      'grammar',
      'vocabulary',
      'coherence',
      'task',
    ]);
    expect(first.feedback).toBeTruthy();
    expect(first.corrections.length).toBeGreaterThan(0);
  });

  it('câu bỏ trống không gọi AI, tính 0 điểm; bài ngắn được điểm thấp hơn', async () => {
    const exam = await createWritingExam(prisma, teacherId);
    const attemptId = await startAndWrite(exam, ['A man rides.', '   ', null]);

    const submitted = await submit(attemptId);
    expect(submitted.grading?.total).toBe(1);
    const graded = await waitForResult(attemptId, (result) => result.status === 'GRADED');
    expect(graded.skillScores[0].openRaw).toBeLessThan(3);

    const questions = await reviewQuestions(attemptId);
    expect(questions.map((q) => q.outcome)).toEqual(['SCORED', 'SKIPPED', 'SKIPPED']);
    expect(questions[1].assessment).toBeNull();
    expect(questions[2].assessment).toBeNull();
  });

  it('bỏ trống cả bài: chấm xong ngay khi nộp, 0 điểm, không có câu nào chờ AI', async () => {
    const exam = await createWritingExam(prisma, teacherId);
    const attemptId = await startAndWrite(exam, [null, null, null]);

    const submitted = await submit(attemptId);
    expect(submitted).toMatchObject({ status: 'GRADED', scaledScore: 0, grading: null });
  });

  it('nộp hai lần không tạo phiếu chấm trùng', async () => {
    const exam = await createWritingExam(prisma, teacherId);
    const attemptId = await startAndWrite(exam, FULL_ANSWERS);

    await Promise.all([submit(attemptId), submit(attemptId)]);
    await submit(attemptId);
    const count = await prisma.answerAssessment.count({
      where: { attemptAnswer: { attemptId } },
    });
    expect(count).toBe(3);
    await waitForResult(attemptId, (result) => result.status === 'GRADED');
  });

  it('luyện riêng một Part Writing: tính % điểm đạt', async () => {
    const exam = await createWritingExam(prisma, teacherId);
    const attemptId = await startAndWrite(exam, [FULL_ANSWERS[0]], exam.part1SectionId);

    await submit(attemptId);
    const graded = await waitForResult(attemptId, (result) => result.status === 'GRADED');
    expect(graded).toMatchObject({ scoring: 'PERCENT', scaledScore: 100 });
  });

  it('AI chấm lỗi quá 3 lần → FAILED, bài vẫn chờ; học viên chấm lại → có điểm → GRADED', async () => {
    const exam = await createWritingExam(prisma, teacherId);
    const attemptId = await startAndWrite(exam, [
      `${FULL_ANSWERS[0]} #fail`,
      FULL_ANSWERS[1],
      FULL_ANSWERS[2],
    ]);
    await submit(attemptId);

    const failed = await waitForResult(
      attemptId,
      (result) => (result.grading?.failed ?? 0) === 1 && result.grading?.pending === 0,
    );
    expect(failed).toMatchObject({ status: 'SUBMITTED', scaledScore: null, pendingOpenCount: 1 });

    const [broken] = await reviewQuestions(attemptId);
    expect(broken.outcome).toBe('FAILED');
    const assessment = broken.assessment as QuestionAssessment;
    expect(assessment).toMatchObject({ status: 'FAILED', regradesLeft: 2 });
    expect(assessment.errorMessage).toBeTruthy();

    // Học viên khác không chấm lại được câu của bài này
    const foreign = await otherStudent.post(
      `/attempts/${attemptId}/assessments/${assessment.id}/regrade`,
    );
    expect(foreign.status).toBe(404);
    expect(errorOf(foreign).code).toBe('ASSESSMENT_NOT_FOUND');

    const regrade = await student.post(
      `/attempts/${attemptId}/assessments/${assessment.id}/regrade`,
    );
    expect(regrade.status).toBe(200);
    expect(data<QuestionAssessment>(regrade)).toMatchObject({ status: 'PENDING', regradesLeft: 1 });

    const graded = await waitForResult(attemptId, (result) => result.status === 'GRADED');
    expect(graded.scaledScore).toBe(200);

    // Câu đã có điểm thì không chấm lại
    const again = await student.post(`/attempts/${attemptId}/assessments/${assessment.id}/regrade`);
    expect(again.status).toBe(409);
    expect(errorOf(again).code).toBe('ASSESSMENT_NOT_FAILED');
  });

  it('hết 2 lượt chấm lại thì báo ASSESSMENT_REGRADE_LIMIT', async () => {
    const exam = await createWritingExam(prisma, teacherId);
    const attemptId = await startAndWrite(exam, [`${FULL_ANSWERS[0]} #fail`, null, null]);
    await submit(attemptId);
    await waitForResult(attemptId, (result) => result.grading?.failed === 1);

    const row = await prisma.answerAssessment.findFirstOrThrow({
      where: { attemptAnswer: { attemptId } },
      select: { id: true },
    });
    await prisma.answerAssessment.update({
      where: { id: row.id },
      data: { regradeCount: 2, status: AssessmentStatus.FAILED },
    });
    const res = await student.post(`/attempts/${attemptId}/assessments/${row.id}/regrade`);
    expect(res.status).toBe(409);
    expect(errorOf(res).code).toBe('ASSESSMENT_REGRADE_LIMIT');
  });

  it('học viên khác không xem được kết quả chấm', async () => {
    const exam = await createWritingExam(prisma, teacherId);
    const attemptId = await startAndWrite(exam, FULL_ANSWERS);
    await submit(attemptId);

    const res = await otherStudent.get(`/attempts/${attemptId}/review`);
    expect(res.status).toBe(404);
    await waitForResult(attemptId, (result) => result.status === 'GRADED');
  });
});
