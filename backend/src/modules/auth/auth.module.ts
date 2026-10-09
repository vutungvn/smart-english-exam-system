import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { TokenService } from './token.service.js';
import { OneTimeTokenService } from './one-time-token.service.js';
import { AuthLimitService } from './auth-limit.service.js';
import { AUTH_THROTTLE } from './auth.constants.js';
import { GoogleOAuthService } from './google-oauth.service.js';

@Module({
  imports: [
    JwtModule.register({}),
    // Bộ đếm trong bộ nhớ tiến trình; ThrottlerGuard chỉ gắn ở AuthController
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ...AUTH_THROTTLE.default }] }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OneTimeTokenService,
    AuthLimitService,
    GoogleOAuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [TokenService],
})
export class AuthModule {}
