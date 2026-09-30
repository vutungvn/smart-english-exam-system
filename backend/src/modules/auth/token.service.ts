import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { RoleCode } from '../../common/constants/roles.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { Env } from '../../config/env.schema.js';

interface AccessTokenPayload {
  sub: string;
  role: RoleCode;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  readonly accessTokenTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.accessTokenTtl = config.get('JWT_ACCESS_TTL', { infer: true });
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
}
