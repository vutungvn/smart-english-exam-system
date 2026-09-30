import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MeProfile } from './me.types.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { RoleCode } from '../../common/constants/roles.js';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<MeProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        status: true,
        mustChangePassword: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { code: true } },
      },
    });

    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'Tài khoản không còn tồn tại');

    const { role, ...profile } = user;
    return { ...profile, role: role.code as RoleCode };
  }
}
