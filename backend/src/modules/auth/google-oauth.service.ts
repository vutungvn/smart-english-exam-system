import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { Env } from '../../config/env.schema.js';
import { randomBytes } from 'node:crypto';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { GOOGLE_SCOPES } from './auth.constants.js';

/** Thông tin lấy từ id_token đã xác minh chữ ký */
export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  avatarUrl?: string;
}

export interface GoogleAuthRequest {
  url: string;
  state: string;
  codeVerifier: string;
}

// Chỉ nói chuyện với Google; quyết định tạo/liên kết tài khoản nằm ở AuthService
@Injectable()
export class GoogleOAuthService {
  private readonly client: OAuth2Client | null;
  private readonly clientId?: string;

  constructor(config: ConfigService<Env, true>) {
    this.clientId = config.get('GOOGLE_CLIENT_ID', { infer: true }) || undefined;
    const clientSecret = config.get('GOOGLE_CLIENT_SECRET', { infer: true });

    this.client =
      this.clientId && clientSecret
        ? new OAuth2Client({
            client_id: this.clientId,
            clientSecret,
            redirectUri: config.get('GOOGLE_CALLBACK_URL', { infer: true }),
          })
        : null;
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /** URL trang chọn tài khoản Google, kèm state và PKCE để callback kiểm tra */
  async createAuthRequest(): Promise<GoogleAuthRequest> {
    const client = this.requireClient();

    const state = randomBytes(32).toString('base64url');
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();

    const url = client.generateAuthUrl({
      scope: GOOGLE_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      // Luôn cho chọn tài khoản, không tự đăng nhập bằng tài khoản Google đang mở sẵn
      prompt: 'select_account',
    });

    return { url, state, codeVerifier };
  }

  /** Đổi code lấy id_token rồi xác minh chữ ký, audience, hạn dùng của token */
  async exchangeCode(code: string, codeVerifier: string): Promise<GoogleProfile> {
    const client = this.requireClient();

    const { tokens } = await client.getToken({
      code,
      codeVerifier,
    });

    if (!tokens.id_token) throw new AppException(ErrorCode.AUTH_GOOGLE_FAILED);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) throw new AppException(ErrorCode.AUTH_GOOGLE_FAILED);

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      fullName: payload.name ?? '',
      avatarUrl: payload.picture,
    };
  }

  private requireClient(): OAuth2Client {
    if (!this.client) throw new AppException(ErrorCode.AUTH_GOOGLE_DISABLED);
    return this.client;
  }
}
