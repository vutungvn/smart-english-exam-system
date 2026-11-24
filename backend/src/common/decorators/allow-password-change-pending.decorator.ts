import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_PENDING_KEY = 'allowPasswordChangePending';

/**
 * Route vẫn gọi được khi tài khoản đang bị buộc đổi mật khẩu (mustChangePassword): xem hồ sơ,
 * đổi mật khẩu. Các route khác JwtAuthGuard trả 403 AUTH_PASSWORD_CHANGE_REQUIRED.
 * Route @Public() (đăng nhập, làm mới token, đăng xuất) không bị chặn nên không cần gắn.
 */
export const AllowPasswordChangePending = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_PENDING_KEY, true);
