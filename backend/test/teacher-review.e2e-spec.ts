import { setTimeout as sleep } from 'node:timers/promises';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import type { QuestionAssessment } from '../src/modules/assessments/assessments.types.js';
import type {
  AgreementStats,
  CalibrationSample,
  TeacherReviewDetail,
  TeacherReviewItem,
} from '../src/modules/assessments/teacher-assessments.types.js';
import type {
  AttemptDetail,
  AttemptResult,
  AttemptReview,
  ReviewQuestion,
} from '../src/modules/attempts/attempts.types.js';
import {
  api,
  createSpeakingSwExam,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
  webm,
} from './e2e/helpers.js';

describe('Giáo viên chấm lại Speaking/Writing (e2e, FakeAiProvider)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authorId: string;
  let student: ReturnType<typeof api>;
  let studentId: string;
  let otherStudent: ReturnType<typeof api>;
  let teacher: ReturnType<typeof api>;
  let teacherName: string;
  let otherTeacher: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    authorId = (await createUser(prisma, RoleCode.TEACHER)).id;
    const user = await createUser(prisma, RoleCode.STUDENT);
    studentId = user.id;
    student = api(app, await login(app, user.email));
    otherStudent = api(app, await login(app, (await createUser(prisma, RoleCode.STUDENT)).email));
    // Giáo viên chấm không phải tác giả đề: mọi giáo viên đều chấm được
    const grader = await createUser(prisma, RoleCode.TEACHER);
    teacherName = (await prisma.user.findUniqueOrThrow({ where: { id: grader.id } })).fullName;
    teacher = api(app, await login(app, grader.email));
    otherTeacher = api(app, await login(app, (await createUser(prisma, RoleCode.TEACHER)).email));
    await student.put('/me/voice-consent', {});
  });

  afterAll(async () => {
    await app.close();
  });

  /** Làm đề Speaking (Part 1 + Part 3), nộp, chờ AI xong; trả id bài làm và id 2 câu trả lời */
  async function speakingAttempt(
    seconds: number[],
    done: (result: AttemptResult) => boolean,
    examAuthorId = authorId,
  ): Promise<{ attemptId: string; part1: string; part3: string }> {
    const exam = await createSpeakingSwExam(prisma, examAuthorId);
    const attempt = data<AttemptDetail>(
      await student.post(`/exams/${exam.examId}/attempts`, { mode: 'FULL' }),
    );
    const ids = attempt.paper.sections.flatMap((section) =>
      section.blocks.flatMap((block) => block.questions.map((q) => q.examQuestionId)),
    );
    for (const [index, length] of seconds.entries()) {
      await student.upload(
        `/attempts/${attempt.id}/answers/${ids[index]}/audio`,
        webm(length),
        'answer.webm',
      );
    }
    await student.post(`/attempts/${attempt.id}/submit`);
    const until = Date.now() + 25_000;
    while (!done(await result(attempt.id))) {
      if (Date.now() > until) throw new Error('Hết thời gian chờ AI chấm');
      await sleep(300);
    }
    const answers = await prisma.attemptAnswer.findMany({
      where: { attemptId: attempt.id },
      select: { id: true, examQuestionId: true },
    });
    const answerOf = (examQuestionId: string) =>
      answers.find((answer) => answer.examQuestionId === examQuestionId)!.id;
    return { attemptId: attempt.id, part1: answerOf(ids[0]), part3: answerOf(ids[1]) };
  }

  async function result(attemptId: string): Promise<AttemptResult> {
    return data<AttemptDetail>(await student.get(`/attempts/${attemptId}`)).result as AttemptResult;
  }

  async function reviewQuestions(attemptId: string): Promise<ReviewQuestion[]> {
    const review = data<AttemptReview>(await student.get(`/attempts/${attemptId}/review`));
    return review.sections.flatMap((section) => section.blocks.flatMap((block) => block.questions));
  }

  async function waiting(query = ''): Promise<TeacherReviewItem[]> {
    const res = await teacher.get(`/teacher/assessments?limit=100${query}`);
    expect(res.status).toBe(200);
    return data<TeacherReviewItem[]>(res);
  }

  it('học viên yêu cầu chấm lại → giáo viên chấm → điểm bài tính lại, học viên thấy bản giáo viên', async () => {
    const { attemptId, part1, part3 } = await speakingAttempt(
      [45, 15],
      (r) => r.status === 'GRADED',
    );
    expect((await result(attemptId)).scaledScore).toBe(200);
    const [, respond] = await reviewQuestions(attemptId);
    const aiId = (respond.assessment as QuestionAssessment).id;
    const url = `/attempts/${attemptId}/assessments/${aiId}/review-request`;

    // Học viên gửi yêu cầu: lý do quá ngắn bị chặn, người khác không gửi được, chỉ một lần
    expect((await student.post(url, { note: 'ab' })).status).toBe(400);
    expect((await otherStudent.post(url, { note: 'Em thấy điểm thấp' })).status).toBe(404);
    const requested = await student.post(url, { note: 'Em thấy mình trả lời đủ ý' });
    expect(requested.status).toBe(200);
    const again = await student.post(url, { note: 'Gửi lần nữa' });
    expect(again.status).toBe(409);
    expect(errorOf(again).code).toBe('ASSESSMENT_REVIEW_ALREADY_REQUESTED');

    // Giáo viên (không phải tác giả đề) thấy câu trong hàng đợi, học viên ẩn danh
    const item = (await waiting()).find((row) => row.answerId === part3);
    expect(item).toMatchObject({
      reasons: ['STUDENT_REQUEST'],
      requestNote: 'Em thấy mình trả lời đủ ý',
      isMyExam: false,
      skill: 'SPEAKING',
      part: 3,
      aiScore: 3,
      maxScore: 3,
      teacherScore: null,
    });
    expect(item?.studentCode).toMatch(/^HV-[0-9A-F]{6}$/);
    expect(JSON.stringify(item)).not.toContain(studentId);
    // Lọc "đề của tôi": giáo viên này không soạn đề nên không thấy
    expect((await waiting('&scope=MINE')).some((row) => row.answerId === part3)).toBe(false);

    const detail = data<TeacherReviewDetail>(await teacher.get(`/teacher/assessments/${part3}`));
    expect(detail.aiAssessment).toMatchObject({ grader: 'AI', score: 3 });
    expect(detail.teacherAssessment).toBeNull();
    expect(detail.answer.recordingUrl).toBeTruthy();
    expect(detail.criteriaOptions).toHaveLength(6);
    expect(detail.subScoreOptions).toEqual([]);

    // Ngoài thang: 422
    const tooHigh = await teacher.put(`/teacher/assessments/${part3}`, {
      score: 4,
      feedback: 'Quá điểm',
    });
    expect(tooHigh.status).toBe(422);
    expect(errorOf(tooHigh).code).toBe('ASSESSMENT_SCORE_OUT_OF_RANGE');
    const badCriteria = await teacher.put(`/teacher/assessments/${part3}`, {
      score: 1,
      criteria: { coherence: 3 },
      feedback: 'Tiêu chí của Writing',
    });
    expect(badCriteria.status).toBe(422);

    const graded = await teacher.put(`/teacher/assessments/${part3}`, {
      score: 1,
      criteria: { fluency: 2, task: 1 },
      feedback: 'Trả lời thiếu ý thứ hai, cần nói rõ lý do.',
    });
    expect(graded.status).toBe(200);
    const saved = data<TeacherReviewDetail>(graded).teacherAssessment as QuestionAssessment;
    expect(saved).toMatchObject({ grader: 'TEACHER', score: 1, reviewerName: teacherName });

    // Điểm bài tính lại: 6 + 1 = 7/9 (77,8%) < 200
    const after = await result(attemptId);
    expect(after.status).toBe('GRADED');
    expect(after.skillScores[0]).toMatchObject({ openRaw: 7, openMax: 9 });
    expect(after.scaledScore).toBeLessThan(200);

    const [, reviewed] = await reviewQuestions(attemptId);
    expect(reviewed.outcome).toBe('SCORED');
    expect(reviewed.assessment).toMatchObject({
      grader: 'TEACHER',
      score: 1,
      reviewerName: teacherName,
      feedback: 'Trả lời thiếu ý thứ hai, cần nói rõ lý do.',
    });
    expect(reviewed.aiAssessment).toMatchObject({ grader: 'AI', score: 3 });
    expect(reviewed.reviewRequest?.note).toBe('Em thấy mình trả lời đủ ý');

    // Học viên nhận thông báo; câu rời hàng đợi chờ, sang tab đã chấm
    const notification = await prisma.notification.findFirst({
      where: { userId: studentId, type: 'TEACHER_REVIEWED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notification?.message).toContain('Speaking Part 3');
    expect((await waiting()).some((row) => row.answerId === part3)).toBe(false);
    const done = (await waiting('&tab=REVIEWED')).find((row) => row.answerId === part3);
    expect(done).toMatchObject({ teacherScore: 1, reviewerName: teacherName });

    // Yêu cầu nữa sau khi giáo viên đã chấm: 409
    expect(errorOf(await student.post(url, { note: 'Lần nữa ạ' })).code).toBe(
      'ASSESSMENT_TEACHER_REVIEWED',
    );

    // Giáo viên khác sửa: thiếu hoặc sai updatedAt thì 409, đúng thì ghi đè
    const stale = await otherTeacher.put(`/teacher/assessments/${part3}`, {
      score: 2,
      feedback: 'Sửa lại điểm',
    });
    expect(stale.status).toBe(409);
    expect(errorOf(stale).code).toBe('VERSION_CONFLICT');
    const edited = await otherTeacher.put(`/teacher/assessments/${part3}`, {
      score: 2,
      feedback: 'Sửa lại điểm',
      updatedAt: saved.updatedAt,
    });
    expect(edited.status).toBe(200);
    expect((await result(attemptId)).skillScores[0].openRaw).toBe(8);

    // Speaking Part 1: bắt buộc 2 điểm con, điểm câu là tổng
    const noSub = await teacher.put(`/teacher/assessments/${part1}`, {
      score: 5,
      feedback: 'Đọc khá rõ',
    });
    expect(noSub.status).toBe(422);
    const sub = await teacher.put(`/teacher/assessments/${part1}`, {
      subScores: { pronunciation: 3, intonation: 2 },
      feedback: 'Đọc rõ, ngữ điệu còn đều',
    });
    expect(sub.status).toBe(200);
    const [readAloud] = await reviewQuestions(attemptId);
    expect(readAloud.assessment).toMatchObject({ grader: 'TEACHER', score: 5 });
    expect(readAloud.assessment?.subScores.map((s) => [s.key, s.score])).toEqual([
      ['pronunciation', 3],
      ['intonation', 2],
    ]);
  });

  it('AI chấm lỗi → vào hàng đợi → giáo viên chấm thay → bài có điểm, học viên không cần chấm lại', async () => {
    const { attemptId, part3 } = await speakingAttempt([45, 1], (r) => r.grading?.failed === 1);
    const item = (await waiting()).find((row) => row.answerId === part3);
    expect(item).toMatchObject({ reasons: ['AI_FAILED'], aiStatus: 'FAILED', aiScore: null });

    const res = await teacher.put(`/teacher/assessments/${part3}`, {
      score: 1,
      feedback: 'Bài nói quá ngắn, chỉ được một ý.',
    });
    expect(res.status).toBe(200);

    const after = await result(attemptId);
    expect(after).toMatchObject({ status: 'GRADED', pendingOpenCount: 0 });
    expect(after.grading).toMatchObject({ failed: 0, done: 2 });

    const [, short] = await reviewQuestions(attemptId);
    expect(short).toMatchObject({ outcome: 'SCORED' });
    const failedAi = short.aiAssessment as QuestionAssessment;
    expect(failedAi.status).toBe('FAILED');
    const regrade = await student.post(`/attempts/${attemptId}/assessments/${failedAi.id}/regrade`);
    expect(regrade.status).toBe(409);
    expect(errorOf(regrade).code).toBe('ASSESSMENT_TEACHER_REVIEWED');
  });

  it('chấm đối chiếu: ẩn điểm AI tới khi lưu, đo độ lệch AI so với giáo viên', async () => {
    // Giáo viên tác giả đề riêng: lọc "đề của tôi" để không lẫn dữ liệu các test khác
    const author = await createUser(prisma, RoleCode.TEACHER);
    const calibrator = api(app, await login(app, author.email));
    const { part1, part3 } = await speakingAttempt(
      [45, 15],
      (r) => r.status === 'GRADED',
      author.id,
    );

    const next = data<CalibrationSample>(
      await calibrator.get('/teacher/assessments/calibration/next?scope=MINE'),
    );
    expect(next.remaining).toBe(2);
    expect([part1, part3]).toContain(next.answerId);

    // Mở ở chế độ chấm đối chiếu: không lộ điểm, tiêu chí, transcript của AI
    const blind = data<TeacherReviewDetail>(
      await calibrator.get(`/teacher/assessments/${part3}?blind=true`),
    );
    expect(blind).toMatchObject({ blind: true, aiAssessment: null, aiScore: null, aiStatus: null });
    // Không có blind thì vẫn xem được bản AI như bình thường
    const normal = data<TeacherReviewDetail>(await calibrator.get(`/teacher/assessments/${part3}`));
    expect(normal).toMatchObject({ blind: false, aiScore: 3 });

    // Lưu kèm blind: lần đầu chấm thì là mẫu đối chiếu; phản hồi hiện lại bản AI để so
    const saved = data<TeacherReviewDetail>(
      await calibrator.put(`/teacher/assessments/${part3}`, {
        score: 2,
        feedback: 'Trả lời đúng ý nhưng thiếu chi tiết.',
        blind: true,
      }),
    );
    expect(saved).toMatchObject({ blind: false, blindReview: true, aiScore: 3, teacherScore: 2 });
    await calibrator.put(`/teacher/assessments/${part1}`, {
      subScores: { pronunciation: 3, intonation: 3 },
      feedback: 'Đọc rõ ràng, ngữ điệu tự nhiên.',
      blind: true,
    });
    expect(
      data<CalibrationSample>(
        await calibrator.get('/teacher/assessments/calibration/next?scope=MINE'),
      ),
    ).toEqual({ answerId: null, remaining: 0 });

    // Part 3: AI 3, GV 2 (lệch 1 = 33,3% thang) · Part 1: AI 6, GV 6
    const stats = data<AgreementStats>(
      await calibrator.get('/teacher/assessments/agreement?scope=MINE'),
    );
    expect(stats.overall).toMatchObject({
      count: 2,
      mae: 0.5,
      maePercent: 16.7,
      biasPercent: 16.7,
      exactRate: 50,
      withinOneRate: 100,
    });
    expect(stats.bySkill.map((row) => [row.skill, row.count])).toEqual([['SPEAKING', 2]]);
    expect(stats.byPart.map((row) => [row.part, row.count, row.exactRate])).toEqual([
      [1, 1, 100],
      [3, 1, 0],
    ]);
    expect(stats.pairs[0]).toMatchObject({ answerId: part3, diff: 1, blindReview: true });

    // Sửa lại sau khi đã thấy điểm AI: không còn là mẫu đối chiếu
    await calibrator.put(`/teacher/assessments/${part3}`, {
      score: 3,
      feedback: 'Xem lại thì đủ ý.',
      updatedAt: (saved.teacherAssessment as QuestionAssessment).updatedAt,
    });
    const blindOnly = data<AgreementStats>(
      await calibrator.get('/teacher/assessments/agreement?scope=MINE'),
    );
    expect(blindOnly.overall.count).toBe(1);
    const all = data<AgreementStats>(
      await calibrator.get('/teacher/assessments/agreement?scope=MINE&sample=ALL'),
    );
    expect(all.overall).toMatchObject({ count: 2, exactRate: 100 });
  });

  it('chỉ giáo viên vào được; câu không tồn tại 404', async () => {
    expect((await student.get('/teacher/assessments')).status).toBe(403);
    expect((await student.get('/teacher/assessments/agreement')).status).toBe(403);
    const missing = await teacher.get('/teacher/assessments/00000000-0000-4000-8000-000000000000');
    expect(missing.status).toBe(404);
    expect(errorOf(missing).code).toBe('ASSESSMENT_NOT_FOUND');
  });
});
