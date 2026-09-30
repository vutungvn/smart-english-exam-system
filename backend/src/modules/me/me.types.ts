import type { RoleCode } from '../../common/constants/roles.js';
import type { UserStatus } from '../../generated/prisma/client.js';

// Hồ sơ trả về cho GET /me; không bao giờ chứa passwordHash
export interface MeProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: RoleCode;
  status: UserStatus;
  mustChangePassword: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
