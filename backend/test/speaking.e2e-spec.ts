import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import type {
  AttemptDetail,
  AttemptReview,
  SaveRecordingResult,
} from '../src/modules/attempts/attempts.types.js';
import type { MeProfile } from '../src/modules/me/me.types.js';
import {
  api,
  createSpeakingExam,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
  webm,
} from './e2e/helpers.js';

describe('Ghi âm Speaking (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let teacherId: string;
  let student: ReturnType<typeof api>;
  let otherStudent: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    const teacherUser = await createUser(prisma, RoleCode.TEACHER);
    const studentUser = await createUser(prisma, RoleCode.STUDENT);
    const otherUser = await createUser(prisma, RoleCode.STUDENT);
    teacherId = teacherUser.id;
    student = api(app, await login(app, studentUser.email));
    otherStudent = api(app, await login(app, otherUser.email));
  });

  afterAll(async () => {
    await app.close();
  });

  it('đề có Speaking: phải đồng ý ghi âm trước khi bắt đầu', async () => {
    const exam = await createSpeakingExam(prisma, teacherId);

    const blocked = await otherStudent.post(`/exams/${exam.examId}/attempts`, { mode: 'FULL' });
    expect(blocked.status).toBe(403);
    expect(errorOf(blocked).code).toBe('VOICE_CONSENT_REQUIRED');

    const consent = await otherStudent.put('/me/voice-consent', {});
    expect(consent.status).toBe(200);
    const consentAt = data<MeProfile>(consent).student?.voiceConsentAt;
    expect(consentAt).toBeTruthy();

    // Gọi lại không đổi thời điểm đồng ý ban đầu
    const again = data<MeProfile>(await otherStudent.put('/me/voice-consent', {}));
    expect(again.student?.voiceConsentAt).toEqual(consentAt);

    const started = await otherStudent.post(`/exams/${exam.examId}/attempts`, { mode: 'FULL' });
    expect(started.status).toBe(201);
  });

  it('luyện riêng Part Speaking: cũng cần đồng ý, chỉ có Part đó, tải bài nói lên được', async () => {
    const fresh = await createUser(prisma, RoleCode.STUDENT);
    const learner = api(app, await login(app, fresh.email));
    const exam = await createSpeakingExam(prisma, teacherId);
    const body = { mode: 'PART', sectionId: exam.speakingSectionId };

    const blocked = await learner.post(`/exams/${exam.examId}/attempts`, body);
    expect(blocked.status).toBe(403);
    expect(errorOf(blocked).code).toBe('VOICE_CONSENT_REQUIRED');

    await learner.put('/me/voice-consent', {});
    const started = await learner.post(`/exams/${exam.examId}/attempts`, body);
    expect(started.status).toBe(201);
    const attempt = data<AttemptDetail>(started);
    expect(attempt.paper.sections.map((section) => section.skill)).toEqual(['SPEAKING']);
    expect(attempt.remainingSeconds).toBeNull();

    const [first] = exam.speakingIds;
    const uploaded = await learner.upload(
      `/attempts/${attempt.id}/answers/${first}/audio`,
      webm(2),
      'answer.webm',
    );
    expect(uploaded.status).toBe(200);

    // Luyện Part Speaking: bài nói chờ AI chấm, câu chưa ghi âm 0 điểm (không chờ chấm)
    const result = await learner.post(`/attempts/${attempt.id}/submit`);
    expect(result.status).toBe(200);
    expect(data<{ status: string; pendingOpenCount: number }>(result)).toMatchObject({
      status: 'SUBMITTED',
      pendingOpenCount: 1,
    });
  });

  it('tải lên → chuẩn hóa MP3 → ghi đè → nộp → nghe lại ở trang xem lại', async () => {
    await student.put('/me/voice-consent', {});
    const exam = await createSpeakingExam(prisma, teacherId);
    const [first, second] = exam.speakingIds;
    const attempt = data<AttemptDetail>(
      await student.post(`/exams/${exam.examId}/attempts`, { mode: 'FULL' }),
    );
    const url = (examQuestionId: string) =>
      `/attempts/${attempt.id}/answers/${examQuestionId}/audio`;

    const uploaded = await student.upload(url(first), webm(3), 'answer.webm');
    expect(uploaded.status).toBe(200);
    expect(data<SaveRecordingResult>(uploaded).seconds).toBeGreaterThan(2.5);
    const firstKey = (
      await prisma.attemptAnswer.findFirstOrThrow({
        where: { attemptId: attempt.id, examQuestionId: first },
        select: { audioKey: true },
      })
    ).audioKey;
    expect(firstKey).toMatch(/^recordings\/[0-9a-f-]{36}\.mp3$/);

    // Ghi âm lại (hoặc tải lên lại sau lỗi mạng): vẫn một bản ghi, key mới
    expect((await student.upload(url(first), webm(4), 'answer.webm')).status).toBe(200);
    const answers = await prisma.attemptAnswer.findMany({
      where: { attemptId: attempt.id },
      select: { audioKey: true },
    });
    expect(answers).toHaveLength(1);
    expect(answers[0].audioKey).not.toBe(firstKey);

    // Làm tiếp bài: biết câu nào đã có bài nói
    const detail = data<AttemptDetail>(await student.get(`/attempts/${attempt.id}`));
    expect(detail.answers.find((answer) => answer.examQuestionId === first)?.hasRecording).toBe(
      true,
    );

    await student.post(`/attempts/${attempt.id}/submit`);
    const review = data<AttemptReview>(await student.get(`/attempts/${attempt.id}/review`));
    const questions = review.sections.flatMap((section) =>
      section.blocks.flatMap((block) => block.questions),
    );
    const answered = questions.find((question) => question.examQuestionId === first);
    const skipped = questions.find((question) => question.examQuestionId === second);
    // Worker chấm nền (FakeAi) có thể đã chấm xong trước khi mở trang xem lại
    expect(['PENDING', 'SCORED']).toContain(answered?.outcome);
    expect(skipped?.outcome).toBe('SKIPPED');
    expect(skipped?.recordingUrl).toBeNull();

    // URL ký phát lại được MP3; sửa chữ ký thì bị từ chối
    const recordingUrl = answered?.recordingUrl ?? '';
    const played = await request(app.getHttpServer()).get(recordingUrl);
    expect(played.status).toBe(200);
    expect(played.headers['content-type']).toBe('audio/mpeg');
    const forged = await request(app.getHttpServer()).get(
      recordingUrl.replace(/sig=.{4}/, 'sig=xxxx'),
    );
    expect(forged.status).toBe(403);
  });

  it('từ chối bài nói quá dài, tệp không phải âm thanh, câu không phải Speaking, bài của người khác', async () => {
    await student.put('/me/voice-consent', {});
    const exam = await createSpeakingExam(prisma, teacherId);
    const [first] = exam.speakingIds;
    const attempt = data<AttemptDetail>(
      await student.post(`/exams/${exam.examId}/attempts`, { mode: 'FULL' }),
    );
    const url = (examQuestionId: string) =>
      `/attempts/${attempt.id}/answers/${examQuestionId}/audio`;

    // Thời gian trả lời 15 giây (+3 giây dung sai)
    const long = await student.upload(url(first), webm(25), 'answer.webm');
    expect(long.status).toBe(400);
    expect(errorOf(long).code).toBe('ATTEMPT_RECORDING_TOO_LONG');

    const text = await student.upload(url(first), Buffer.from('not audio'), 'answer.webm');
    expect(text.status).toBe(400);
    expect(errorOf(text).code).toBe('ATTEMPT_RECORDING_INVALID');

    const choice = await student.upload(url(exam.choiceId), webm(2), 'answer.webm');
    expect(choice.status).toBe(400);
    expect(errorOf(choice).code).toBe('VALIDATION_ERROR');

    const other = await otherStudent.upload(url(first), webm(2), 'answer.webm');
    expect(other.status).toBe(404);
    expect(errorOf(other).code).toBe('ATTEMPT_NOT_FOUND');

    expect(await prisma.attemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(0);
  });
});
