import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { io, type Socket } from 'socket.io-client';
import type { App } from 'supertest/types.js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RoleCode } from '../src/common/constants/roles.js';
import { NotificationType } from '../src/generated/prisma/enums.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { AttemptAutoSubmitService } from '../src/modules/attempts/attempt-auto-submit.service.js';
import type { AttemptDetail } from '../src/modules/attempts/attempts.types.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';
import type {
  NotificationItem,
  UnreadNotificationCount,
} from '../src/modules/notifications/notifications.types.js';
import {
  api,
  createExam,
  createSpeakingSwExam,
  createTestApp,
  createUser,
  data,
  errorOf,
  login,
  webm,
} from './e2e/helpers.js';

const WAIT_MS = 25_000;

describe('Thông báo: REST /me/notifications và Socket.IO /notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let baseUrl: string;
  let teacherId: string;
  let studentId: string;
  let token: string;
  let student: ReturnType<typeof api>;
  let other: ReturnType<typeof api>;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    // Socket.IO cần cổng thật (supertest chỉ gọi thẳng vào server)
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${((app.getHttpServer() as unknown as Server).address() as AddressInfo).port}`;
    teacherId = (await createUser(prisma, RoleCode.TEACHER)).id;
    const user = await createUser(prisma, RoleCode.STUDENT);
    studentId = user.id;
    token = await login(app, user.email);
    student = api(app, token);
    other = api(app, await login(app, (await createUser(prisma, RoleCode.STUDENT)).email));
    await student.put('/me/voice-consent', {});
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.close();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Kết nối namespace /notifications; lỗi xác thực thì reject bằng connect_error */
  function connect(auth: { token?: string }): Promise<Socket> {
    const socket = io(`${baseUrl}/notifications`, {
      auth,
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  }

  /** Chờ thông báo đầu tiên thỏa điều kiện */
  function next(
    socket: Socket,
    match: (item: NotificationItem) => boolean,
  ): Promise<NotificationItem> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Hết thời gian chờ thông báo')), WAIT_MS);
      const listener = (item: NotificationItem) => {
        if (!match(item)) return;
        clearTimeout(timer);
        socket.off('notification', listener);
        resolve(item);
      };
      socket.on('notification', listener);
    });
  }

  async function unread(client = student): Promise<number> {
    return data<UnreadNotificationCount>(await client.get('/me/notifications/unread-count')).count;
  }

  describe('Kết nối WebSocket', () => {
    it('không có token hoặc token sai: từ chối kết nối (UNAUTHORIZED)', async () => {
      await expect(connect({})).rejects.toThrow('UNAUTHORIZED');
      await expect(connect({ token: 'abc' })).rejects.toThrow('UNAUTHORIZED');
    });

    it('token hợp lệ: chỉ chủ tài khoản nhận thông báo, mọi tab đang mở đều nhận', async () => {
      const [tab1, tab2] = await Promise.all([connect({ token }), connect({ token })]);
      const outsider = await connect({ token: await loginOther() });
      let leaked = false;
      outsider.on('notification', () => (leaked = true));

      const received = Promise.all([
        next(tab1, (item) => item.title === 'Thử'),
        next(tab2, (item) => item.title === 'Thử'),
      ]);
      await app.get(NotificationsService).notify(studentId, {
        type: NotificationType.ATTEMPT_GRADED,
        title: 'Thử',
        message: 'Nội dung thử',
      });
      const [first] = await received;
      expect(first).toMatchObject({ title: 'Thử', readAt: null, data: null });
      expect(leaked).toBe(false);
    });

    it('access token hết hạn thì server ngắt kết nối', async () => {
      const short = await new JwtService().signAsync(
        { sub: studentId, role: RoleCode.STUDENT },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: 1 },
      );
      const socket = await connect({ token: short });
      const reason = await new Promise((resolve) => socket.once('disconnect', resolve));
      expect(reason).toBe('io server disconnect');
    });
  });

  describe('REST', () => {
    it('xem danh sách, đếm chưa đọc, đánh dấu đã đọc; không đụng được thông báo người khác', async () => {
      const service = app.get(NotificationsService);
      const user = await createUser(prisma, RoleCode.STUDENT);
      const client = api(app, await login(app, user.email));
      expect(await unread(client)).toBe(0);

      for (const title of ['Một', 'Hai']) {
        await service.notify(user.id, {
          type: NotificationType.ATTEMPT_GRADED,
          title,
          message: title,
        });
      }
      const res = await client.get('/me/notifications?limit=10');
      expect(res.status).toBe(200);
      const items = data<NotificationItem[]>(res);
      expect(items.map((item) => item.title)).toEqual(['Hai', 'Một']);
      expect((res.body as { meta: unknown }).meta).toMatchObject({ page: 1, limit: 10, total: 2 });
      expect(await unread(client)).toBe(2);

      // Người khác: 404 như không tồn tại
      const notMine = await other.post(`/me/notifications/${items[0].id}/read`);
      expect(notMine.status).toBe(404);
      expect(errorOf(notMine).code).toBe('NOTIFICATION_NOT_FOUND');

      expect((await client.post(`/me/notifications/${items[0].id}/read`)).status).toBe(200);
      // Đọc lại lần nữa vẫn 200, giữ nguyên
      expect((await client.post(`/me/notifications/${items[0].id}/read`)).status).toBe(200);
      expect(await unread(client)).toBe(1);

      expect((await client.post('/me/notifications/read-all')).status).toBe(200);
      expect(await unread(client)).toBe(0);
    });

    it('id sai định dạng: 404', async () => {
      const res = await student.post('/me/notifications/khong-phai-uuid/read');
      expect(res.status).toBe(404);
      expect(errorOf(res).code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('chưa đăng nhập: 401', async () => {
      expect((await api(app).get('/me/notifications')).status).toBe(401);
    });
  });

  describe('Thông báo của luồng làm bài', () => {
    async function startSpeaking(seconds: number[]): Promise<string> {
      const exam = await createSpeakingSwExam(prisma, teacherId);
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
      return attempt.id;
    }

    it('AI chấm xong Speaking: đẩy ATTEMPT_GRADED kèm điểm và attemptId', async () => {
      const socket = await connect({ token });
      const attemptId = await startSpeaking([45, 15]);
      const graded = next(
        socket,
        (item) => item.type === 'ATTEMPT_GRADED' && item.data?.attemptId === attemptId,
      );
      await student.post(`/attempts/${attemptId}/submit`);

      const item = await graded;
      expect(item.title).toBe('Đã chấm xong bài làm');
      expect(item.message).toContain('200 điểm');
    });

    it('câu chấm lỗi: đẩy GRADING_FAILED một lần cho bài làm', async () => {
      const socket = await connect({ token });
      const attemptId = await startSpeaking([1, 1]);
      const failed = next(
        socket,
        (item) => item.type === 'GRADING_FAILED' && item.data?.attemptId === attemptId,
      );
      await student.post(`/attempts/${attemptId}/submit`);
      await failed;

      // Chờ câu còn lại cũng lỗi: vẫn chỉ một thông báo (thông báo trước chưa đọc)
      const until = Date.now() + WAIT_MS;
      while (
        (await prisma.answerAssessment.count({
          where: { status: 'FAILED', attemptAnswer: { attemptId } },
        })) < 2
      ) {
        if (Date.now() > until) throw new Error('Hết thời gian chờ chấm lỗi');
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      const count = await prisma.notification.count({
        where: {
          userId: studentId,
          type: 'GRADING_FAILED',
          data: { path: ['attemptId'], equals: attemptId },
        },
      });
      expect(count).toBe(1);
    });

    it('hết giờ, hệ thống tự nộp: đẩy ATTEMPT_AUTO_SUBMITTED kèm điểm', async () => {
      const socket = await connect({ token });
      const exam = await createExam(prisma, teacherId);
      const attempt = data<AttemptDetail>(
        await student.post(`/exams/${exam.examId}/attempts`, { mode: 'FULL' }),
      );
      await student.put(`/attempts/${attempt.id}/answers/${exam.questions[0].examQuestionId}`, {
        selectedOptionId: exam.questions[0].correctOptionId,
      });
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          startedAt: new Date(Date.now() - 60 * 60_000),
          expiresAt: new Date(Date.now() - 10 * 60_000),
        },
      });
      const auto = next(
        socket,
        (item) => item.type === 'ATTEMPT_AUTO_SUBMITTED' && item.data?.attemptId === attempt.id,
      );
      await app.get(AttemptAutoSubmitService).submitExpired();

      const item = await auto;
      expect(item.title).toBe('Hết giờ, hệ thống đã tự nộp bài');
      // Đề Part 5 ở chế độ trọn đề có điểm ngay (không có câu AI chấm)
      expect(item.message).toMatch(/điểm|%/);

      // Học viên tự nộp thì không có thông báo: lượt quét lại không báo lần nữa
      await app.get(AttemptAutoSubmitService).submitExpired();
      const count = await prisma.notification.count({
        where: {
          type: 'ATTEMPT_AUTO_SUBMITTED',
          data: { path: ['attemptId'], equals: attempt.id },
        },
      });
      expect(count).toBe(1);
    });
  });

  async function loginOther(): Promise<string> {
    return login(app, (await createUser(prisma, RoleCode.STUDENT)).email);
  }
});
