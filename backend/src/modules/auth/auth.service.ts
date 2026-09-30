import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UserStatus } from '../../generated/prisma/enums.js';
import { hashPassword, verifyPassword } from './password.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { TokenService } from './token.service.js';
import { LoginDto } from './dto/login.dto.js';
import { IssuedSession, RequestMeta } from './auth.types.js';
import { normalizeEmail } from '../../common/utils/email.js';
import { AppException } from '../../common/errors/app.exception.js';
import { RoleCode } from '../../common/constants/roles.js';
import { User } from '../../generated/prisma/client.js';

// Trạng thái không được đăng nhập → mã lỗi trả về + lý do ghi vào login_histories.
// Dùng chung cho 3 vai trò: học viên chưa xác minh, giáo viên chờ duyệt, tài khoản bị khóa.
const BLOCKED_STATUSES: Partial<Record<UserStatus, { code: ErrorCode; reason: string }>> = {
  [UserStatus.PENDING_VERIFICATION]: {
    code: ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
    reason: 'EMAIL_NOT_VERIFIED',
  },
  [UserStatus.PENDING_APPROVAL]: {
    code: ErrorCode.AUTH_ACCOUNT_PENDING_APPROVAL,
    reason: 'PENDING_APPROVAL',
  },
  [UserStatus.LOCKED]: { code: ErrorCode.AUTH_ACCOUNT_LOCKED, reason: 'ACCOUNT_LOCKED' },
};

// Các cột cần để cấp phiên, dùng chung cho login và refresh
type SessionUser = Pick<User, 'id' | 'email' | 'fullName' | 'mustChangePassword'> & {
  role: { code: string };
};

@Injectable()
export class AuthService {
  // Hash giả để so khớp khi email không tồn tại, giữ thời gian phản hồi như khi email có thật
  private readonly dummyPasswordHash = hashPassword('timing-attack-dummy-password');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta): Promise<IssuedSession> {
    const email = normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { select: { code: true } } },
    });

    const passwordHash = user?.passwordHash ?? (await this.dummyPasswordHash);
    const passwordMatches = await verifyPassword(dto.password, passwordHash);

    if (!user || !passwordMatches) {
      await this.recordLogin(user?.id, meta, 'INVALID_PASSWORD');
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // Mật khẩu đúng rồi mới báo trạng thái, tránh bị dò trạng thái tài khoản
    const blocked = BLOCKED_STATUSES[user.status];

    if (blocked) {
      await this.recordLogin(user.id, meta, blocked.reason);
      throw new AppException(blocked.code);
    }

    const session = await this.createSession(user);

    await Promise.all([
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      this.recordLogin(user.id, meta),
    ]);

    return session;
  }

  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw new AppException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);

    // Hủy phiên cũ trước; token bị dùng lại sẽ ném lỗi ngay trong bước này
    const userId = await this.tokens.rotateRefreshToken(refreshToken);

    // Đọc lại từ DB để phiên mới phản ánh đúng trạng thái và vai trò hiện tại
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: { select: { code: true } } },
    });

    // Tài khoản bị khóa hoặc xóa sau khi đăng nhập: không cấp phiên mới, đăng xuất mọi thiết bị
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.tokens.revokeAllSessions(userId);
      throw new AppException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
    }

    return this.createSession(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.tokens.revokeRefreshToken(refreshToken);
  }

  private async createSession(user: SessionUser): Promise<IssuedSession> {
    const role = user.role.code as RoleCode;

    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccessToken({ id: user.id, role }),
      this.tokens.createRefreshToken(user.id),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokens.accessTokenTtl,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  // Chỉ ghi cho tài khoản có thật vì login_histories.user_id là khóa ngoại tới users
  private async recordLogin(
    userId: string | undefined,
    meta: RequestMeta,
    failureReason?: string,
  ): Promise<void> {
    if (!userId) return;

    await this.prisma.loginHistory.create({
      data: {
        userId,
        success: !failureReason,
        failureReason,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent?.slice(0, 500), // cột VARCHAR(500)
      },
    });
  }
}
