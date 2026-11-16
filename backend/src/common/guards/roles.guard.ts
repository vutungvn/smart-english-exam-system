import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '../constants/roles.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AuthenticatedRequest } from '../types/auth-user.js';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';

/**
 * Chạy sau JwtAuthGuard (đăng ký ngay sau nó trong AuthModule), lúc này request.user đã có.
 * Route không gắn @Roles thì cho qua: chỉ cần đăng nhập là đủ (ví dụ /me).
 */

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<RoleCode[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length || context.getType() !== 'http') return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Vai trò lấy từ access token: đổi vai trò có hiệu lực từ lần cấp token kế tiếp (≤ 15 phút)
    if (!user || !roles.includes(user.role)) throw new AppException(ErrorCode.FORBIDDEN);

    return true;
  }
}
