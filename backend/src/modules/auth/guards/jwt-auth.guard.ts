import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PASSWORD_CHANGE_PENDING_KEY } from '../../../common/decorators/allow-password-change-pending.decorator.js';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { ERROR_CATALOG, ErrorCode } from '../../../common/errors/error-codes.js';
import type { AuthenticatedRequest } from '../../../common/types/auth-user.js';
import { TokenService } from '../token.service.js';

const ACCOUNT_LOCKED_MESSAGE = ERROR_CATALOG[ErrorCode.AUTH_ACCOUNT_LOCKED].message;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // WebSocket sẽ có guard riêng khi làm Socket.IO
    if (isPublic || context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new AppException(ErrorCode.UNAUTHORIZED);

    const payload = await this.tokens.verifyAccessToken(token);

    // Tài khoản vừa bị admin khóa: trả 401 (không phải 403) để FE thử refresh, refresh thất bại
    // vì phiên đã bị thu hồi thì FE tự đăng xuất
    if (await this.tokens.isUserLocked(payload.id)) {
      throw new AppException(ErrorCode.UNAUTHORIZED, ACCOUNT_LOCKED_MESSAGE);
    }
    request.user = payload;

    // Bị buộc đổi mật khẩu: chỉ gọi được route gắn @AllowPasswordChangePending() (xem hồ sơ, đổi
    // mật khẩu). Chặn ở server để không lách được bằng cách gọi API trực tiếp, bỏ qua giao diện
    if (payload.mustChangePassword) {
      const allowed = this.reflector.getAllAndOverride<boolean | undefined>(
        ALLOW_PASSWORD_CHANGE_PENDING_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (!allowed) throw new AppException(ErrorCode.AUTH_PASSWORD_CHANGE_REQUIRED);
    }
    return true;
  }
}
