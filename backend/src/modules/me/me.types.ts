import type { RoleCode } from '../../common/constants/roles.js';
import type { Level, UserStatus } from '../../generated/prisma/client.js';

// Phần riêng của học viên; null với giáo viên và admin
export interface StudentProfile {
  currentLevel: Level | null;
  currentScore: number | null;
  targetScore: number | null;
}

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
  student: StudentProfile | null;
}
