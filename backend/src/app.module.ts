import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.schema.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MeModule } from './modules/me/me.module.js';
import { RedisModule } from './infra/redis/redis.module.js';
import { MailModule } from './infra/mail/mail.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { StorageModule } from './infra/storage/storage.module.js';
import { SubjectsModule } from './modules/subjects/subjects.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { ExamsModule } from './modules/exams/exams.module.js';
import { AttemptsModule } from './modules/attempts/attempts.module.js';
import { QuestionImportModule } from './modules/question-import/question-import.module.js';
import { ProgressModule } from './modules/progress/progress.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Tác vụ định kỳ (@Interval): tự nộp bài hết giờ
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    MailModule,
    StorageModule,
    CommonModule,
    AuthModule,
    MeModule,
    MediaModule,
    SubjectsModule,
    QuestionsModule,
    QuestionImportModule,
    ExamsModule,
    AttemptsModule,
    ProgressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
