import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UserStatus } from '../../generated/prisma/enums.js';
import { hashPassword, verifyPassword } from './password.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { TokenService } from './token.service.js';
import { LoginDto } from './dto/login.dto.js';
import { IssuedSession, RegisterResult, RequestMeta } from './auth.types.js';
import { normalizeEmail } from '../../common/utils/email.js';
import { AppException } from '../../common/errors/app.exception.js';
import { RoleCode } from '../../common/constants/roles.js';
import { Prisma, User } from '../../generated/prisma/client.js';
import { OneTimeTokenService } from './one-time-token.service.js';
import { AuthLimitService } from './auth-limit.service.js';
import { MailService } from '../../infra/mail/mail.service.js';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema.js';
import { RegisterDto } from './dto/register.dto.js';
import { verifyEmailTemplate } from './templates/verify-email.template.js';
import { VERIFY_EMAIL_TTL_SECONDS } from './auth.constants.js';

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
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly oneTimeTokens: OneTimeTokenService,
    private readonly limits: AuthLimitService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    // Bỏ dấu "/" cuối để không ra link dạng http://host//verify-email
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/+$/, '');
  }

  async register(dto: RegisterDto): Promise<RegisterResult> {
    const email = normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new AppException(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
    }

    const [studentRoleId, passwordHash] = await Promise.all([
      this.findRoldId(RoleCode.STUDENT),
      hashPassword(dto.password),
    ]);

    let user: User;

    try {
      user = await this.prisma.user.create({
        data: {
          roleId: studentRoleId,
          email,
          passwordHash,
          fullName: dto.fullName,
          status: UserStatus.PENDING_VERIFICATION,
          termsAcceptedAt: new Date(),
          student: { create: {} },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }

    await this.sendVerificationEmail(user);

    return {
      id: user.id,
      email: user.email,
      status: user.status,
    };
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.oneTimeTokens.consume('verify-email', token);
    if (!userId) throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);

    // Chỉ kích hoạt tài khoản đang chờ xác minh, không mở nhầm tài khoản đã bị khóa.
    // (Giáo viên sau này sẽ chuyển sang PENDING_APPROVAL thay vì ACTIVE.)
    await this.prisma.user.updateMany({
      where: { id: userId, status: UserStatus.PENDING_VERIFICATION },
      data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
    });
  }

  async resendVerification(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    await this.limits.assertEmailQuota('resend-verification', email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, status: true },
    });

    // Email không tồn tại hoặc đã xác minh: vẫn trả thành công như nhau, không lộ thông tin
    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) return;

    await this.sendVerificationEmail(user);
  }

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

  private async findRoldId(code: RoleCode): Promise<string> {
    const role = await this.prisma.role.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!role) throw new Error(`Chưa có vai trò ${code}, hãy chạy npm run db:seed`);

    return role.id;
  }

  private async sendVerificationEmail(
    user: Pick<User, 'id' | 'email' | 'fullName'>,
  ): Promise<void> {
    const token = await this.oneTimeTokens.create('verify-email', user.id);
    const link = `${this.appUrl}/verify-email?token=${token}`;

    this.mail.sendInBackground({
      to: user.email,
      ...verifyEmailTemplate({
        fullName: user.fullName,
        link,
        expiresInHours: VERIFY_EMAIL_TTL_SECONDS / 3600,
      }),
    });
  }
}
