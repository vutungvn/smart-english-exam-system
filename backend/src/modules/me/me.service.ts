import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { LoginHistoryItem, MeProfile } from './me.types.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { RoleCode } from '../../common/constants/roles.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { TokenService } from '../auth/token.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

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
        student: { select: { currentLevel: true, currentScore: true, targetScore: true } },
      },
    });

    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'Tài khoản không còn tồn tại');

    const { role, ...profile } = user;
    return { ...profile, role: role.code as RoleCode };
  }

  async getLoginHistory(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<WithMeta<LoginHistoryItem[]>> {
    const where = { userId };

    // Đếm và lấy trang trong cùng transaction để total khớp với dữ liệu trả về.
    // Truy vấn đi theo chỉ mục ix_login_histories_user_created (user_id, created_at DESC).
    const [items, total] = await this.prisma.$transaction([
      this.prisma.loginHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          success: true,
          failureReason: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
        ...toPrismaPage(query),
      }),
      this.prisma.loginHistory.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  async updateProfile(user: AuthUser, dto: UpdateProfileDto): Promise<MeProfile> {
    // Điểm mục tiêu nằm ở bảng students, chỉ học viên mới có
    if (dto.targetScore !== undefined && user.role !== RoleCode.STUDENT) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Chỉ học viên mới đặt được điểm mục tiêu');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // undefined: Prisma bỏ qua trường này, giữ nguyên giá trị cũ
        fullName: dto.fullName,
        student:
          dto.targetScore === undefined
            ? undefined
            : {
                upsert: {
                  create: { targetScore: dto.targetScore },
                  update: { targetScore: dto.targetScore },
                },
              },
      },
    });

    return this.getProfile(user.id);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.newPassword === dto.currentPassword) {
      throw new AppException(ErrorCode.BAD_REQUEST, 'Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'Tài khoản không còn tồn tại');

    const currentMatches = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!currentMatches) throw new AppException(ErrorCode.AUTH_CURRENT_PASSWORD_INCORRECT);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(dto.newPassword), mustChangePassword: false },
    });

    // Đăng xuất mọi thiết bị (kể cả thiết bị này): FE tự đăng nhập lại bằng mật khẩu mới.
    // Không giữ lại phiên hiện tại được vì cookie refresh chỉ gửi kèm /api/v1/auth/*.
    await this.tokens.revokeAllSessions(userId);
  }
}
