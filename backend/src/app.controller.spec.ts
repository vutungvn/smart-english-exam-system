import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './module/prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  const prismaMock = {
    $queryRaw: vi.fn().mockResolvedValue([{ database: 'smart_exam', version: 'PostgreSQL 16.4' }]),
    role: { count: vi.fn().mockResolvedValue(3) },
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('db-check', () => {
    it('should return database info and role count', async () => {
      await expect(appController.checkDatabase()).resolves.toEqual({
        database: 'smart_exam',
        version: 'PostgreSQL 16.4',
        roleCount: 3,
      });
    });
  });
});
