import { Request } from 'express';
import { RoleCode } from '../constants/roles.js';

// Thông tin lấy từ access token, JwtAuthGuard gắn vào request.user
export interface AuthUser {
  id: string;
  role: RoleCode;
  /**
   * Tài khoản phải đổi mật khẩu (admin từ seed, tài khoản do admin tạo). Đổi mật khẩu xong backend
   * thu hồi mọi phiên, lần đăng nhập lại cấp token mới không còn cờ này
   */
  mustChangePassword?: boolean;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };
