import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';
import { AvatarService } from './avatar.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MeController],
  providers: [MeService, AvatarService],
})
export class MeModule {}
