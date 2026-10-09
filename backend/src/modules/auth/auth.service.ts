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
import { RESET_PASSWORD_TTL_SECONDS, VERIFY_EMAIL_TTL_SECONDS } from './auth.constants.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { resetPasswordTemplate } from './templates/reset-password.template.js';
import { GoogleProfile } from './google-oauth.service.js';

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
type SessionUser = Pick<User, 'id' | 'email' | 'fullName' | 'avatarUrl' | 'mustChangePassword'> & {
  role: { code: string };
};

// Cột users.avatar_url là VARCHAR(500); ảnh Google dài hơn thì bỏ qua
const AVATAR_URL_MAX_LENGTH = 500;

// Thông báo theo số phút còn lại, details trả số giây để FE hiển thị đếm ngược
function loginLockedError(seconds: number): AppException {
  return new AppException(
    ErrorCode.AUTH_TOO_MANY_LOGIN_ATTEMPTS,
    `Bạn đã nhập sai mật khẩu quá nhiều lần, vui lòng thử lại sau ${Math.ceil(seconds / 60)} phút`,
    { retryAfterSeconds: seconds },
  );
}

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
      this.findRoleId(RoleCode.STUDENT),
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

  async forgotPassword(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    await this.limits.assertEmailQuota('forgot-password', email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, status: true },
    });

    // Email không tồn tại hoặc tài khoản bị khóa: không gửi gì nhưng vẫn trả thành công như nhau
    if (!user || user.status === UserStatus.LOCKED) return;

    const token = await this.oneTimeTokens.create('reset-password', user.id);

    this.mail.sendInBackground({
      to: user.email,
      ...resetPasswordTemplate({
        fullName: user.fullName,
        link: `${this.appUrl}/reset-password?token=${token}`,
        expiresInMinutes: RESET_PASSWORD_TTL_SECONDS / 60,
      }),
    });
  }

  async validateResetToken(token: string): Promise<void> {
    const userId = await this.oneTimeTokens.peek('reset-password', token);
    if (!userId) throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // Hủy token ngay khi dùng: dù các bước sau lỗi, link này cũng không dùng lại được
    const userId = await this.oneTimeTokens.consume('reset-password', dto.token);
    if (!userId) throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);

    const passwordHash = await hashPassword(dto.newPassword);

    // updateMany kèm điều kiện: tài khoản đã bị xóa hoặc bị khóa sau khi gửi link thì không đổi gì
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, status: { not: UserStatus.LOCKED } },
      data: { passwordHash, mustChangePassword: false },
    });
    if (count === 0) throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);

    // updateMany không trả về bản ghi nên đọc lại email để xóa bộ đếm đăng nhập sai
    const { email } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    // Đăng xuất mọi thiết bị: phiên cũ (có thể của người đã biết mật khẩu cũ) không dùng tiếp được.
    // Đồng thời mở khóa đăng nhập tạm: người dùng vừa chứng minh sở hữu email.
    await Promise.all([
      this.tokens.revokeAllSessions(userId),
      this.limits.resetLoginFailures(email),
    ]);
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<IssuedSession> {
    const email = normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { select: { code: true } } },
    });

    // Đang bị khóa tạm: từ chối trước khi so mật khẩu, kể cả mật khẩu đúng, để không đoán tiếp được
    const lockedFor = await this.limits.loginLockRemaining(email);
    if (lockedFor > 0) {
      await this.recordLogin(user?.id, meta, 'TOO_MANY_ATTEMPTS');
      throw loginLockedError(lockedFor);
    }

    const passwordHash = user?.passwordHash ?? (await this.dummyPasswordHash);
    const passwordMatches = await verifyPassword(dto.password, passwordHash);

    if (!user || !passwordMatches) {
      // Đếm cả email không tồn tại: email nào cũng bị khóa sau 5 lần sai, không lộ email nào có thật
      const lockSeconds = await this.limits.recordLoginFailure(email);
      await this.recordLogin(user?.id, meta, 'INVALID_PASSWORD');
      if (lockSeconds > 0) throw loginLockedError(lockSeconds);
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // Mật khẩu đúng thì xóa bộ đếm, kể cả khi tài khoản đang chờ xác minh hoặc chờ duyệt
    await this.limits.resetLoginFailures(email);

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

  /**
   * Đăng nhập bằng Google, chỉ dành cho học viên:
   * - googleId đã liên kết → đăng nhập
   * - email đã có (học viên) → liên kết Google vào tài khoản đó
   * - chưa có → tạo học viên mới, ACTIVE ngay vì Google đã xác minh email
   */
  async loginWithGoogle(profile: GoogleProfile, meta: RequestMeta): Promise<IssuedSession> {
    if (!profile.emailVerified) throw new AppException(ErrorCode.AUTH_GOOGLE_EMAIL_UNVERIFIED);

    const email = normalizeEmail(profile.email);
    const include = { role: { select: { code: true } } } as const;

    // Ưu tiên googleId: người dùng đổi email trên Google vẫn vào đúng tài khoản cũ
    const user =
      (await this.prisma.user.findUnique({ where: { googleId: profile.googleId }, include })) ??
      (await this.prisma.user.findUnique({ where: { email }, include }));

    if (!user) return this.createGoogleStudent(profile, email, meta);

    // Giáo viên, admin giữ đăng nhập bằng mật khẩu (giáo viên còn phải qua bước duyệt)
    const roleCode = (user as SessionUser).role.code;
    if (roleCode !== RoleCode.STUDENT) {
      await this.recordLogin(user.id, meta, 'GOOGLE_NOT_ALLOWED');
      throw new AppException(ErrorCode.AUTH_GOOGLE_STUDENT_ONLY);
    }

    // Email này đã liên kết với một tài khoản Google khác
    if (user.googleId && user.googleId !== profile.googleId) {
      await this.recordLogin(user.id, meta, 'GOOGLE_ACCOUNT_MISMATCH');
      throw new AppException(
        ErrorCode.AUTH_GOOGLE_FAILED,
        'Email này đã liên kết với một tài khoản Google khác',
      );
    }

    if (user.status === UserStatus.LOCKED) {
      await this.recordLogin(user.id, meta, 'ACCOUNT_LOCKED');
      throw new AppException(ErrorCode.AUTH_ACCOUNT_LOCKED);
    }

    const now = new Date();
    const linked = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: profile.googleId,
        lastLoginAt: now,
        avatarUrl: user.avatarUrl ?? this.googleAvatar(profile),
        // Tài khoản chưa xác minh email: người đặt mật khẩu chưa chứng minh sở hữu email này,
        // có thể là kẻ đăng ký trước bằng email của nạn nhân → bỏ mật khẩu đó, kích hoạt bằng Google
        ...(user.status === UserStatus.PENDING_VERIFICATION && {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
          passwordHash: null,
        }),
      },
      include,
    });

    await this.recordLogin(linked.id, meta);
    return this.createSession(linked);
  }

  private async createGoogleStudent(
    profile: GoogleProfile,
    email: string,
    meta: RequestMeta,
  ): Promise<IssuedSession> {
    const studentRoleId = await this.findRoleId(RoleCode.STUDENT);
    const now = new Date();

    let user: SessionUser & { id: string };

    try {
      user = await this.prisma.user.create({
        data: {
          roleId: studentRoleId,
          email,
          googleId: profile.googleId,
          // Không có mật khẩu; muốn đăng nhập bằng mật khẩu thì dùng Quên mật khẩu
          fullName: profile.fullName.trim().slice(0, 100) || email.split('@')[0],
          avatarUrl: this.googleAvatar(profile),
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
          // Nút Google ở FE có dòng "Bằng việc tiếp tục, bạn đồng ý Điều khoản..."
          termsAcceptedAt: now,
          lastLoginAt: now,
          student: { create: {} },
        },
        include: { role: { select: { code: true } } },
      });
    } catch (error) {
      // Hai tab cùng đăng nhập lần đầu một lúc: tab sau trùng email/googleId, bấm lại là vào được
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(ErrorCode.AUTH_GOOGLE_FAILED);
      }
      throw error;
    }

    await this.recordLogin(user.id, meta);
    return this.createSession(user);
  }

  private googleAvatar(profile: GoogleProfile): string | null {
    const url = profile.avatarUrl;
    return url && url.length <= AVATAR_URL_MAX_LENGTH ? url : null;
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
        avatarUrl: user.avatarUrl,
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

  private async findRoleId(code: RoleCode): Promise<string> {
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
