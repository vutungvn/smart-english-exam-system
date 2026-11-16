import { Request } from 'express';
import { RoleCode } from '../constants/roles.js';

// Thông tin lấy từ access token, JwtAuthGuard gắn vào request.user
export interface AuthUser {
  id: string;
  role: RoleCode;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };
