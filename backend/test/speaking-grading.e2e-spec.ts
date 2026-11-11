import { setTimeout as sleep } from 'node:timers/promises';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { StorageService } from '../src/infra/storage/storage.service.js';
import { RecordingCleanupService } from '../src/modules/attempts/recording-cleanup.service.js';
import type { QuestionAssessment } from '../src/modules/assessments/assessments.types.js';
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
  type SpeakingSwExamFixture,
} from './e2e/helpers.js';

/** Bài nói dài đúng thời gian trả lời: FakeAi cho điểm tối đa (Part 1 45 giây, Part 3 15 giây) */
const FULL_SECONDS = [45, 15];

describe('Chấm Speaking bằng AI (e2e, FakeAiProvider)', () => {
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
    await student.put('/me/voice-consent', {});
    await otherStudent.put('/me/voice-consent', {});
  });

  afterAll(async () => {
    await app.close();
  });

  /** Bắt đầu làm cả đề (hoặc một Part), ghi âm theo thứ tự câu; null là bỏ trống */
  async function startAndRecord(
    exam: SpeakingSwExamFixture,
    seconds: (number | null)[],
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
    for (const [index, length] of seconds.entries()) {
      if (length === null) continue;
      const uploaded = await student.upload(
        `/attempts/${attempt.id}/answers/${ids[index]}/audio`,
        webm(length),
        'answer.webm',
      );
      expect(uploaded.status).toBe(200);
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

  it('nộp đề Speaking: chờ chấm → AI nghe từng bài nói → GRADED, điểm 0–200', async () => {
    const exam = await createSpeakingSwExam(prisma, teacherId);
    const attemptId = await startAndRecord(exam, FULL_SECONDS);

    const submitted = await submit(attemptId);
    expect(submitted).toMatchObject({ status: 'SUBMITTED', scoring: 'TOEIC_SW' });
    expect(submitted.grading?.total).toBe(2);

    const graded = await waitForResult(attemptId, (result) => result.status === 'GRADED');
    // Đủ thời lượng: Part 1 6/6, Part 3 3/3 → 9/9 → 200
    expect(graded).toMatchObject({ scaledScore: 200, pendingOpenCount: 0 });
    expect(graded.skillScores[0]).toMatchObject({
      skill: 'SPEAKING',
      openMax: 9,
      openRaw: 9,
      scaled: 200,
    });

    const [readAloud, respond] = await reviewQuestions(attemptId);
    expect(readAloud.outcome).toBe('SCORED');
    const first = readAloud.assessment as QuestionAssessment;
    expect(first).toMatchObject({ status: 'DONE', score: 6, maxScore: 6, corrections: [] });
    // Part 1: 2 điểm con (phát âm, ngữ điệu), 6 tiêu chí chẩn đoán, transcript
    expect(first.subScores.map((item) => [item.key, item.score, item.max])).toEqual([
      ['pronunciation', 3, 3],
      ['intonation', 3, 3],
    ]);
    expect(first.criteria.map((item) => item.key)).toEqual([
      'pronunciation',
      'intonation',
      'fluency',
      'grammar',
      'vocabulary',
      'task',
    ]);
    expect(first.transcript).toBeTruthy();
    expect(first.improvedAnswer).toBeNull();

    const second = respond.assessment as QuestionAssessment;
    expect(second).toMatchObject({ status: 'DONE', score: 3, maxScore: 3, subScores: [] });
    expect(second.improvedAnswer).toBeTruthy();
    expect(respond.recordingUrl).toBeTruthy();
  });

  it('câu chưa ghi âm: 0 điểm, không tạo phiếu chấm, không gọi AI', async () => {
    const exam = await createSpeakingSwExam(prisma, teacherId);
    const attemptId = await startAndRecord(exam, [45, null]);

    const submitted = await submit(attemptId);
    expect(submitted.grading?.total).toBe(1);
    const graded = await waitForResult(attemptId, (result) => result.status === 'GRADED');
    // 6/9 = 66,7% → giữa mốc 55% (120) và 70% (150) của Speaking: 143,3 → 140
    expect(graded.skillScores[0]).toMatchObject({ openMax: 9, openRaw: 6, scaled: 140 });

    const [, skipped] = await reviewQuestions(attemptId);
    expect(skipped).toMatchObject({ outcome: 'SKIPPED', assessment: null, recordingUrl: null });
  });

  it('không ghi âm câu nào: chấm xong ngay khi nộp, 0 điểm', async () => {
    const exam = await createSpeakingSwExam(prisma, teacherId);
    const attemptId = await startAndRecord(exam, [null, null]);
    const submitted = await submit(attemptId);
    expect(submitted).toMatchObject({ status: 'GRADED', scaledScore: 0, grading: null });
  });

  it('bài nói quá ngắn (FakeAi giả lỗi) → FAILED → học viên chấm lại → GRADED', async () => {
    const exam = await createSpeakingSwExam(prisma, teacherId);
    const attemptId = await startAndRecord(exam, [45, 1]);
    await submit(attemptId);

    const failed = await waitForResult(attemptId, (result) => result.grading?.failed === 1);
    expect(failed).toMatchObject({ status: 'SUBMITTED', scaledScore: null });
    const [, short] = await reviewQuestions(attemptId);
    expect(short.outcome).toBe('FAILED');
    const assessment = short.assessment as QuestionAssessment;
    expect(assessment.regradesLeft).toBe(2);

    const url = `/attempts/${attemptId}/assessments/${assessment.id}/regrade`;
    const notOwner = await otherStudent.post(url);
    expect(notOwner.status).toBe(404);
    expect(errorOf(notOwner).code).toBe('ASSESSMENT_NOT_FOUND');

    const regraded = await student.post(url);
    expect(regraded.status).toBe(200);
    expect(data<QuestionAssessment>(regraded)).toMatchObject({
      status: 'PENDING',
      regradesLeft: 1,
    });

    const graded = await waitForResult(attemptId, (result) => result.status === 'GRADED');
    expect(graded.scaledScore).not.toBeNull();
    const [, after] = await reviewQuestions(attemptId);
    expect(after.outcome).toBe('SCORED');
  });

  /** Dời cả lúc bắt đầu, hết giờ, nộp bài về quá khứ (giả lập bài nộp từ days ngày trước) */
  const submittedDaysAgo = (attemptId: string, days: number) => prisma.$executeRaw`
    UPDATE exam_attempts
    SET started_at = started_at - make_interval(days => ${days}::int),
        expires_at = expires_at - make_interval(days => ${days}::int),
        submitted_at = submitted_at - make_interval(days => ${days}::int)
    WHERE id = ${attemptId}::uuid`;

  const audioKeys = async (attemptId: string) =>
    (
      await prisma.attemptAnswer.findMany({
        where: { attemptId },
        select: { audioKey: true, audioDeletedAt: true },
      })
    ).map((answer) => answer.audioKey);

  it('bài nói quá 30 ngày: job xóa tệp, giữ điểm và transcript, câu vẫn là đã trả lời', async () => {
    const storage = app.get(StorageService);
    const oldId = await startAndRecord(await createSpeakingSwExam(prisma, teacherId), FULL_SECONDS);
    await submit(oldId);
    await waitForResult(oldId, (result) => result.status === 'GRADED');
    const recentId = await startAndRecord(
      await createSpeakingSwExam(prisma, teacherId),
      FULL_SECONDS,
    );
    await submit(recentId);
    const inProgressId = await startAndRecord(
      await createSpeakingSwExam(prisma, teacherId),
      FULL_SECONDS,
    );

    const oldKeys = await audioKeys(oldId);
    await submittedDaysAgo(oldId, 31);
    // Bài nộp 29 ngày trước chưa tới hạn
    await submittedDaysAgo(recentId, 29);
    expect(await app.get(RecordingCleanupService).cleanup()).toBeGreaterThanOrEqual(2);

    for (const key of oldKeys) expect(await storage.get(key as string)).toBeNull();
    expect(await audioKeys(oldId)).toEqual([null, null]);
    expect((await audioKeys(recentId)).every(Boolean)).toBe(true);
    expect((await audioKeys(inProgressId)).every(Boolean)).toBe(true);

    // Điểm, phiếu chấm, transcript giữ nguyên; chỉ mất nút nghe lại
    const result = data<AttemptDetail>(await student.get(`/attempts/${oldId}`))
      .result as AttemptResult;
    expect(result.scaledScore).toBe(200);
    const [readAloud] = await reviewQuestions(oldId);
    expect(readAloud).toMatchObject({ outcome: 'SCORED', recordingUrl: null });
    expect(readAloud.recordingDeletedAt).toBeTruthy();
    expect((readAloud.assessment as QuestionAssessment).transcript).toBeTruthy();

    // Chạy lại không xóa thêm gì của bài cũ
    await app.get(RecordingCleanupService).cleanup();
    expect(await audioKeys(oldId)).toEqual([null, null]);
  });

  it('chấm lại câu lỗi khi bài nói đã tự xóa: báo ASSESSMENT_RECORDING_MISSING, không mất lượt', async () => {
    const attemptId = await startAndRecord(await createSpeakingSwExam(prisma, teacherId), [45, 1]);
    await submit(attemptId);
    await waitForResult(attemptId, (result) => result.grading?.failed === 1);
    await submittedDaysAgo(attemptId, 31);
    await app.get(RecordingCleanupService).cleanup();

    const [, short] = await reviewQuestions(attemptId);
    expect(short).toMatchObject({ outcome: 'FAILED', recordingUrl: null });
    const assessment = short.assessment as QuestionAssessment;
    const res = await student.post(`/attempts/${attemptId}/assessments/${assessment.id}/regrade`);
    expect(res.status).toBe(404);
    expect(errorOf(res).code).toBe('ASSESSMENT_RECORDING_MISSING');

    const [, after] = await reviewQuestions(attemptId);
    expect((after.assessment as QuestionAssessment).regradesLeft).toBe(2);
  });

  it('luyện riêng Part 3: tính phần trăm', async () => {
    const exam = await createSpeakingSwExam(prisma, teacherId);
    const attemptId = await startAndRecord(exam, [15], exam.part3SectionId);
    const submitted = await submit(attemptId);
    expect(submitted.scoring).toBe('PERCENT');
    const graded = await waitForResult(attemptId, (result) => result.status === 'GRADED');
    expect(graded.scaledScore).toBe(100);
  });
});
