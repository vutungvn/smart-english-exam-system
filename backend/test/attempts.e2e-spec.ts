import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import { AttemptStatus } from '../src/generated/prisma/enums.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { AttemptAutoSubmitService } from '../src/modules/attempts/attempt-auto-submit.service.js';
import type {
  AttemptDetail,
  AttemptResult,
  SaveAnswerResult,
  SyncAnswersResult,
} from '../src/modules/attempts/attempts.types.js';
import {
  api,
  createExam,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
  type ExamFixture,
} from './e2e/helpers.js';

describe('Luồng làm bài (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacherId: string;
  let student: ReturnType<typeof api>;
  let otherStudent: ReturnType<typeof api>;
  let teacher: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const teacherUser = await createUser(prisma, RoleCode.TEACHER);
    const studentUser = await createUser(prisma, RoleCode.STUDENT);
    const otherUser = await createUser(prisma, RoleCode.STUDENT);
    teacherId = teacherUser.id;
    teacher = api(app, await login(app, teacherUser.email));
    student = api(app, await login(app, studentUser.email));
    otherStudent = api(app, await login(app, otherUser.email));
  });

  afterAll(async () => {
    await app.close();
  });

  const startRequest = (exam: ExamFixture) =>
    student.post(`/exams/${exam.examId}/attempts`, { mode: 'FULL' });

  /** Tạo lượt mới trả 201; làm tiếp bài đang dở trả 200 (resumed = true) */
  const start = async (exam: ExamFixture, expectedStatus: 200 | 201 = 201) => {
    const res = await startRequest(exam);
    expect(res.status).toBe(expectedStatus);
    return data<AttemptDetail>(res);
  };

  const answer = (attemptId: string, examQuestionId: string, selectedOptionId: string) =>
    student.put(`/attempts/${attemptId}/answers/${examQuestionId}`, { selectedOptionId });

  /** Dời đồng hồ của bài làm về quá khứ để giả lập hết giờ (không phải chờ thật) */
  const expireAgo = (attemptId: string, seconds: number) =>
    prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        startedAt: new Date(Date.now() - 10 * 60_000),
        expiresAt: new Date(Date.now() - seconds * 1000),
      },
    });

  it('bắt đầu → lưu → làm tiếp → nộp → xem kết quả', async () => {
    const exam = await createExam(prisma, teacherId);
    const [q1, q2] = exam.questions;

    const attempt = await start(exam);
    expect(attempt.status).toBe('IN_PROGRESS');
    expect(attempt.answers).toEqual([]);
    expect(attempt.remainingSeconds).toBeGreaterThan(9 * 60);
    expect(attempt.paper.sections).toHaveLength(1);

    // Câu 1 đúng, câu 2 sai, câu 3 bỏ trống
    const saved = await answer(attempt.id, q1.examQuestionId, q1.correctOptionId);
    expect(saved.status).toBe(200);
    expect(data<SaveAnswerResult>(saved).applied).toBe(true);
    expect((await answer(attempt.id, q2.examQuestionId, q2.wrongOptionId)).status).toBe(200);
    // Gửi lại cùng câu (mạng chập chờn): vẫn chỉ có một bản ghi
    expect((await answer(attempt.id, q1.examQuestionId, q1.correctOptionId)).status).toBe(200);
    expect(await prisma.attemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(2);

    // Thoát rồi vào lại: thấy đủ câu đã trả lời
    const resumed = data<AttemptDetail>(await student.get(`/attempts/${attempt.id}`));
    expect(resumed.answers).toHaveLength(2);

    // Chưa nộp thì chưa xem được đáp án
    const early = await student.get(`/attempts/${attempt.id}/review`);
    expect(early.status).toBe(409);
    expect(errorOf(early).code).toBe('ATTEMPT_NOT_SUBMITTED');

    const submitted = await student.post(`/attempts/${attempt.id}/submit`);
    expect(submitted.status).toBe(200);
    expect(data<AttemptResult>(submitted)).toMatchObject({
      status: 'GRADED',
      scoring: 'PERCENT',
      correctCount: 1,
      wrongCount: 1,
      skippedCount: 1,
      scaledScore: 33.33,
    });

    const detail = data<AttemptDetail>(await student.get(`/attempts/${attempt.id}`));
    expect(detail.status).toBe('GRADED');
    expect(detail.result?.correctCount).toBe(1);
    expect((await student.get(`/attempts/${attempt.id}/review`)).status).toBe(200);

    // Đã nộp thì không sửa được câu trả lời
    const late = await answer(attempt.id, q2.examQuestionId, q2.correctOptionId);
    expect(late.status).toBe(409);
    expect(errorOf(late).code).toBe('ATTEMPT_NOT_IN_PROGRESS');
  });

  it('nộp trùng (bấm hai lần, gửi đồng thời) chỉ chấm một lần', async () => {
    const exam = await createExam(prisma, teacherId);
    const [q1] = exam.questions;
    const attempt = await start(exam);
    await answer(attempt.id, q1.examQuestionId, q1.correctOptionId);

    const [first, second] = await Promise.all([
      student.post(`/attempts/${attempt.id}/submit`),
      student.post(`/attempts/${attempt.id}/submit`),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const a = data<AttemptResult>(first);
    const b = data<AttemptResult>(second);
    expect(b.submittedAt).toEqual(a.submittedAt);
    expect(b.correctCount).toBe(1);

    const again = data<AttemptResult>(await student.post(`/attempts/${attempt.id}/submit`));
    expect(again.submittedAt).toEqual(a.submittedAt);
  });

  it('không mở được 2 bài làm dở của cùng một đề', async () => {
    const exam = await createExam(prisma, teacherId);
    const first = await start(exam);

    // Bấm "Bắt đầu" lại: trả về đúng bài đang làm
    const again = await start(exam, 200);
    expect(again.id).toBe(first.id);
    expect(again.resumed).toBe(true);

    // Đang làm cả đề mà chọn luyện một Part: báo có bài dở
    const part = await student.post(`/exams/${exam.examId}/attempts`, {
      mode: 'PART',
      sectionId: exam.sectionId,
    });
    expect(part.status).toBe(409);
    expect(errorOf(part)).toMatchObject({
      code: 'ATTEMPT_IN_PROGRESS',
      details: { attemptId: first.id },
    });

    // Hai lần bấm "Bắt đầu" cùng lúc ở đề khác: chỉ một bài được tạo (201), lần kia làm tiếp (200)
    const other = await createExam(prisma, teacherId);
    const [a, b] = await Promise.all([startRequest(other), startRequest(other)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(data<AttemptDetail>(a).id).toBe(data<AttemptDetail>(b).id);
    expect(
      await prisma.examAttempt.count({
        where: { examId: other.examId, status: AttemptStatus.IN_PROGRESS },
      }),
    ).toBe(1);
  });

  it('không xem, sửa, nộp được bài của người khác', async () => {
    const exam = await createExam(prisma, teacherId);
    const [q1] = exam.questions;
    const attempt = await start(exam);
    const url = `/attempts/${attempt.id}`;

    for (const res of [
      await otherStudent.get(url),
      await otherStudent.get(`${url}/review`),
      await otherStudent.put(`${url}/answers/${q1.examQuestionId}`, {
        selectedOptionId: q1.correctOptionId,
      }),
      await otherStudent.post(`${url}/submit`),
      await otherStudent.post(`${url}/cancel`),
    ]) {
      expect(res.status).toBe(404);
      expect(errorOf(res).code).toBe('ATTEMPT_NOT_FOUND');
    }

    // Giáo viên không gọi được route của học viên; chưa đăng nhập thì 401
    expect((await teacher.get(url)).status).toBe(403);
    expect((await api(app).get(url)).status).toBe(401);

    // Bài của chủ bài không bị ảnh hưởng
    const own = data<AttemptDetail>(await student.get(url));
    expect(own.status).toBe('IN_PROGRESS');
  });

  it('hết giờ: không nhận câu trả lời, mở lại bài thì tự nộp', async () => {
    const exam = await createExam(prisma, teacherId);
    const [q1, q2] = exam.questions;
    const attempt = await start(exam);
    await answer(attempt.id, q1.examQuestionId, q1.correctOptionId);
    // Quá hạn 3 phút: vượt cả ân hạn lưu từng câu (15 giây) lẫn ân hạn đồng bộ lô (2 phút)
    await expireAgo(attempt.id, 180);

    const put = await answer(attempt.id, q2.examQuestionId, q2.correctOptionId);
    expect(put.status).toBe(409);
    expect(errorOf(put).code).toBe('ATTEMPT_EXPIRED');

    const sync = await student.patch(`/attempts/${attempt.id}/answers`, {
      answers: [
        {
          examQuestionId: q2.examQuestionId,
          selectedOptionId: q2.correctOptionId,
          answeredAt: new Date().toISOString(),
        },
      ],
    });
    expect(sync.status).toBe(409);
    expect(errorOf(sync).code).toBe('ATTEMPT_EXPIRED');

    const detail = data<AttemptDetail>(await student.get(`/attempts/${attempt.id}`));
    expect(detail.status).toBe('GRADED');
    expect(detail.result).toMatchObject({ correctCount: 1, skippedCount: 2 });
  });

  it('mất mạng lúc hết giờ: đồng bộ lô sau hạn chỉ giữ câu trả lời trước hạn', async () => {
    const exam = await createExam(prisma, teacherId);
    const [q1, q2] = exam.questions;
    const attempt = await start(exam);
    // Hết giờ 30 giây trước: quá ân hạn lưu từng câu nhưng còn trong 2 phút đồng bộ lô
    await expireAgo(attempt.id, 30);

    expect((await answer(attempt.id, q1.examQuestionId, q1.correctOptionId)).status).toBe(409);

    const sync = await student.patch(`/attempts/${attempt.id}/answers`, {
      answers: [
        // Trả lời lúc còn giờ (khi đang mất mạng): được giữ
        {
          examQuestionId: q1.examQuestionId,
          selectedOptionId: q1.correctOptionId,
          answeredAt: new Date(Date.now() - 60_000).toISOString(),
        },
        // Trả lời sau khi hết giờ: bị bỏ qua
        {
          examQuestionId: q2.examQuestionId,
          selectedOptionId: q2.correctOptionId,
          answeredAt: new Date().toISOString(),
        },
      ],
    });
    expect(sync.status).toBe(200);
    expect(data<SyncAnswersResult>(sync)).toMatchObject({ applied: 1, ignored: 1 });

    const result = data<AttemptResult>(await student.post(`/attempts/${attempt.id}/submit`));
    expect(result).toMatchObject({ correctCount: 1, skippedCount: 2 });
  });

  it('job tự nộp các bài đã quá hạn (kể cả khi học viên không mở lại bài)', async () => {
    const exam = await createExam(prisma, teacherId);
    const attempt = await start(exam);
    await expireAgo(attempt.id, 180);

    await app.get(AttemptAutoSubmitService).submitExpired();

    const row = await prisma.examAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      select: { status: true, submittedAt: true },
    });
    expect(row.status).toBe(AttemptStatus.GRADED);
    expect(row.submittedAt).not.toBeNull();
  });

  it('giới hạn số lượt chỉ tính lượt làm cả đề chưa hủy', async () => {
    const exam = await createExam(prisma, teacherId, { maxAttempts: 1 });

    // Hủy không tính lượt
    const cancelled = await start(exam);
    expect((await student.post(`/attempts/${cancelled.id}/cancel`)).status).toBe(200);

    const attempt = await start(exam);
    await student.post(`/attempts/${attempt.id}/submit`);

    const over = await student.post(`/exams/${exam.examId}/attempts`, { mode: 'FULL' });
    expect(over.status).toBe(409);
    expect(errorOf(over).code).toBe('ATTEMPT_LIMIT_REACHED');
  });
});
