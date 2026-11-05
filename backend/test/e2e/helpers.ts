import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { RoleCode } from '../../src/common/constants/roles.js';
import { UserStatus } from '../../src/generated/prisma/client.js';
import {
  Difficulty,
  ExamStatus,
  QuestionStatus,
  QuestionType,
  ScoringScale,
  Skill,
} from '../../src/generated/prisma/enums.js';
import { PrismaService } from '../../src/infra/prisma/prisma.service.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { partOrder } from '../../src/modules/exams/exam-structure.js';

export const PASSWORD = 'E2e@12345';

/** Dựng app giống main.ts (tiền tố /api/v1, pipe, filter, guard toàn cục nằm trong AppModule) */
export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Người dùng đã kích hoạt; email ngẫu nhiên để chạy lại nhiều lần không trùng */
export async function createUser(
  prisma: PrismaService,
  role: typeof RoleCode.STUDENT | typeof RoleCode.TEACHER,
): Promise<{ id: string; email: string }> {
  const { id: roleId } = await prisma.role.findUniqueOrThrow({ where: { code: role } });
  const email = `${role.toLowerCase()}-${randomUUID().slice(0, 8)}@example.com`;
  return prisma.user.create({
    data: {
      roleId,
      email,
      passwordHash: await hashPassword(PASSWORD),
      fullName: `E2E ${role}`,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      ...(role === RoleCode.STUDENT
        ? { student: { create: {} } }
        : {
            teacher: {
              create: { organization: 'E2E', specialization: 'TOEIC', isApproved: true },
            },
          }),
    },
    select: { id: true, email: true },
  });
}

export async function login(app: INestApplication<App>, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Đăng nhập ${email} lỗi ${res.status}`);
  return data<{ accessToken: string }>(res).accessToken;
}

/** Gọi API /api/v1/... kèm access token (không truyền token: gọi như khách) */
export function api(app: INestApplication<App>, token?: string) {
  const server = app.getHttpServer();
  const auth = <R extends { set: (field: string, value: string) => R }>(req: R): R =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;
  return {
    get: (url: string) => auth(request(server).get(`/api/v1${url}`)),
    post: (url: string, body: object = {}) =>
      auth(request(server).post(`/api/v1${url}`)).send(body),
    put: (url: string, body: object) => auth(request(server).put(`/api/v1${url}`)).send(body),
    patch: (url: string, body: object) => auth(request(server).patch(`/api/v1${url}`)).send(body),
  };
}

/** Phần data của phản hồi thành công { success, status, data } */
export function data<T>(res: Response): T {
  return (res.body as { data: T }).data;
}

/** Phần error của phản hồi lỗi { success: false, status, error } */
export function errorOf(res: Response): { code: string; details?: unknown } {
  return (res.body as { error: { code: string; details?: unknown } }).error;
}

export interface ExamFixture {
  examId: string;
  sectionId: string;
  /** Theo thứ tự trong đề */
  questions: { examQuestionId: string; correctOptionId: string; wrongOptionId: string }[];
}

/**
 * Đề PERCENT đã xuất bản: một Part 5 gồm 3 câu, đáp án đúng luôn là A. Tạo thẳng bằng Prisma để
 * test chỉ tập trung vào luồng làm bài (soạn đề có test riêng của module exams)
 */
export async function createExam(
  prisma: PrismaService,
  authorId: string,
  options: { durationMinutes?: number; maxAttempts?: number | null } = {},
): Promise<ExamFixture> {
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { code: 'TOEIC' },
    select: { id: true, topics: { where: { name: 'P5/P6 – Từ loại' }, select: { id: true } } },
  });
  const topicId = subject.topics[0].id;

  const questionIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const question = await prisma.question.create({
      data: {
        topicId,
        authorId,
        type: QuestionType.SINGLE_CHOICE,
        skill: Skill.READING,
        part: 5,
        difficulty: Difficulty.EASY,
        status: QuestionStatus.ACTIVE,
        content: `E2E question ${i}: The report ------- ready.`,
        explanation: 'E2E',
        options: {
          create: ['A', 'B', 'C', 'D'].map((label, index) => ({
            label,
            content: `Option ${label}`,
            isCorrect: index === 0,
            orderIndex: index,
          })),
        },
      },
      select: { id: true },
    });
    questionIds.push(question.id);
  }

  const exam = await prisma.exam.create({
    data: {
      authorId,
      subjectId: subject.id,
      title: `E2E exam ${randomUUID().slice(0, 8)}`,
      scoringScale: ScoringScale.PERCENT,
      durationMinutes: options.durationMinutes ?? 10,
      maxAttempts: options.maxAttempts ?? null,
      allowPartPractice: true,
      status: ExamStatus.PUBLISHED,
      publishedAt: new Date(),
      sections: {
        create: {
          skill: Skill.READING,
          part: 5,
          orderIndex: partOrder(Skill.READING, 5),
          questions: {
            create: questionIds.map((questionId, orderIndex) => ({ questionId, orderIndex })),
          },
        },
      },
    },
    select: {
      id: true,
      sections: {
        select: {
          id: true,
          questions: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              question: { select: { options: { select: { id: true, isCorrect: true } } } },
            },
          },
        },
      },
    },
  });

  const [section] = exam.sections;
  return {
    examId: exam.id,
    sectionId: section.id,
    questions: section.questions.map(({ id, question }) => ({
      examQuestionId: id,
      correctOptionId: question.options.find((option) => option.isCorrect)?.id ?? '',
      wrongOptionId: question.options.find((option) => !option.isCorrect)?.id ?? '',
    })),
  };
}
