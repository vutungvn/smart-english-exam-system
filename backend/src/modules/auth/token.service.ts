import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { RoleCode } from '../../common/constants/roles.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { Env } from '../../config/env.schema.js';
import { RedisService } from '../../infra/redis/redis.service.js';
import { randomUUID } from 'node:crypto';
import { redisKeys } from './auth.constants.js';

interface AccessTokenPayload {
  sub: string;
  role: RoleCode;
}

interface RefreshTokenPayload {
  sub: string;
  /** Mã phiên, trùng với phần cuối key refresh:{userId}:{jti} trong Redis */
  jti: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  readonly accessTokenTtl: number;
  readonly refreshTokenTtl: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.accessTokenTtl = config.get('JWT_ACCESS_TTL', { infer: true });
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
    this.refreshTokenTtl = config.get('JWT_REFRESH_TTL', { infer: true });
  }

  signAccessToken(user: AuthUser): Promise<string> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    return this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessTokenTtl,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.accessSecret,
        algorithms: ['HS256'], // chỉ chấp nhận đúng thuật toán đã ký, chặn token "alg: none"
      });
      return { id: payload.sub, role: payload.role };
    } catch {
      // Hết hạn, sai chữ ký, sai định dạng: đều trả 401 như nhau
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }
  }

  /** Tạo refresh token và mở phiên tương ứng trong Redis */
  async createRefreshToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const payload: RefreshTokenPayload = { sub: userId, jti };

    const token = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTokenTtl,
    });
    // Phiên sống đúng bằng thời hạn token, hết hạn thì Redis tự xóa key
    await this.redis.set(redisKeys.refreshSession(userId, jti), '1', 'EX', this.refreshTokenTtl);

    return token;
  }

  /**
   * Xoay vòng: hủy phiên của refresh token cũ và trả về userId để cấp cặp token mới.
   * Token có chữ ký hợp lệ nhưng phiên không còn nghĩa là token cũ bị dùng lại → thu hồi mọi phiên.
   */
  async rotateRefreshToken(token: string): Promise<string> {
    const { sub, jti } = await this.verifyRefreshToken(token);

    // DEL là thao tác nguyên tử: hai request dùng cùng một token thì chỉ một request xóa được
    const deleted = await this.redis.del(redisKeys.refreshSession(sub, jti));
    if (deleted === 0) {
      await this.revokeAllSessions(sub);
      this.logger.warn(`Refresh token bị dùng lại, đã thu hồi mọi phiên của user ${sub}`);
      throw new AppException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
    }

    return sub;
  }

  /** Đăng xuất: hủy phiên của token này; token sai hoặc hết hạn thì không có phiên nào để hủy */
  async revokeRefreshToken(token: string): Promise<void> {
    const payload = await this.verifyRefreshToken(token).catch(() => null);
    if (payload) await this.redis.del(redisKeys.refreshSession(payload.sub, payload.jti));
  }

  /** Đăng xuất khỏi mọi thiết bị: dùng khi phát hiện dùng lại, đổi/đặt lại mật khẩu, khóa tài khoản */
  async revokeAllSessions(userId: string): Promise<void> {
    const stream = this.redis.scanStream({
      match: redisKeys.refreshSessionsOf(userId),
      count: 100,
    });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) await this.redis.unlink(...keys);
    }
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new AppException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
    }
  }
}
