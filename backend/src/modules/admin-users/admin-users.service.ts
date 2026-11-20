import { Injectable } from '@nestjs/common';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { UserStatus } from '../../generated/prisma/enums.js';
import { AuditContext, type AuditSnapshot } from '../../infra/audit/audit-context.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { findLoginHistory } from '../auth/login-history.js';
import { TokenService } from '../auth/token.service.js';
import type { LoginHistoryItem } from '../me/me.types.js';
import {
  assertFieldsMatchRole,
  isManagedRole,
  MANAGED_ROLES,
  statusAfterUnlock,
} from './admin-users.rules.js';
import type { AdminUserDetail, AdminUserListItem } from './admin-users.types.js';
import type { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';
import type { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import type { LockUserDto } from './dto/lock-user.dto.js';

const listSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { code: true } },
} satisfies Prisma.UserSelect;

const detailSelect = {
  ...listSelect,
  passwordHash: true,
  googleId: true,
  mustChangePassword: true,
  termsAcceptedAt: true,
  updatedAt: true,
  student: {
    select: { currentLevel: true, currentScore: true, targetScore: true, voiceConsentAt: true },
  },
  teacher: { select: { organization: true, specialization: true, isApproved: true } },
} satisfies Prisma.UserSelect;

type ListRow = Prisma.UserGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.UserGetPayload<{ select: typeof detailSelect }>;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditContext,
  ) {}

  async findAll(query: AdminUserQueryDto): Promise<WithMeta<AdminUserListItem[]>> {
    const q = query.q || undefined;
    const where: Prisma.UserWhereInput = {
      role: { code: query.role ?? { in: [...MANAGED_ROLES] } },
      status: query.status,
      OR: q
        ? [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [field, direction] = query.sort.split(':') as [
      'createdAt' | 'lastLoginAt' | 'fullName' | 'email',
      Prisma.SortOrder,
    ];
    // Người chưa đăng nhập lần nào (lastLoginAt null) luôn xếp cuối, sắp xếp chiều nào cũng vậy
    const order: Prisma.UserOrderByWithRelationInput =
      field === 'lastLoginAt'
        ? { lastLoginAt: { sort: direction, nulls: 'last' } }
        : { [field]: direction };

    // Đếm và lấy trang trong cùng transaction để total khớp với dữ liệu trả về
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: listSelect,
        // Thêm id để thứ tự ổn định khi trùng giá trị sắp xếp (phân trang không lặp/sót)
        orderBy: [order, { id: 'asc' }],
        ...toPrismaPage(query),
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(rows.map(toListItem), total, query);
  }

  async findOne(id: string): Promise<AdminUserDetail> {
    return toDetail(await this.findManagedUserOrThrow(id));
  }

  async update(id: string, dto: AdminUpdateUserDto): Promise<AdminUserDetail> {
    const user = await this.findManagedUserOrThrow(id);
    const role = user.role.code;
    if (!isManagedRole(role)) throw new AppException(ErrorCode.ADMIN_ACCOUNT_PROTECTED);
    assertFieldsMatchRole(role, dto);

    this.audit.setBefore(snapshotOf(user));

    await this.prisma.$transaction(async (tx) => {
      // Khóa lạc quan: chỉ cập nhật khi updatedAt còn khớp lần đọc của admin.
      // Luôn đặt updatedAt mới kể cả khi chỉ sửa hồ sơ con, để lần PATCH sau với dữ liệu cũ bị 409
      const { count } = await tx.user.updateMany({
        where: { id, updatedAt: new Date(dto.updatedAt) },
        data: { fullName: dto.fullName, updatedAt: new Date() },
      });
      if (count === 0) throw new AppException(ErrorCode.VERSION_CONFLICT);

      if (dto.targetScore !== undefined) {
        await tx.student.upsert({
          where: { userId: id },
          create: { userId: id, targetScore: dto.targetScore },
          update: { targetScore: dto.targetScore },
        });
      }
      if (dto.organization !== undefined || dto.specialization !== undefined) {
        await tx.teacher.update({
          where: { userId: id },
          data: { organization: dto.organization, specialization: dto.specialization },
        });
      }
    });

    const updated = await this.findManagedUserOrThrow(id);
    this.audit.setAfter(snapshotOf(updated));
    return toDetail(updated);
  }

  async lock(id: string, dto: LockUserDto): Promise<AdminUserDetail> {
    const user = await this.findManagedUserOrThrow(id);
    if (user.status === UserStatus.LOCKED) throw new AppException(ErrorCode.USER_ALREADY_LOCKED);

    // Điều kiện status trong WHERE: hai admin bấm khóa cùng lúc thì chỉ một lần thành công
    const { count } = await this.prisma.user.updateMany({
      where: { id, status: { not: UserStatus.LOCKED } },
      data: { status: UserStatus.LOCKED },
    });
    if (count === 0) throw new AppException(ErrorCode.USER_ALREADY_LOCKED);

    // Chặn access token còn hạn ngay lập tức và đăng xuất mọi thiết bị
    await Promise.all([this.tokens.markUserLocked(id), this.tokens.revokeAllSessions(id)]);

    this.audit.setBefore({ status: user.status });
    this.audit.setAfter({ status: UserStatus.LOCKED });
    if (dto.reason) this.audit.setMeta({ reason: dto.reason });

    return this.findOne(id);
  }

  async unlock(id: string): Promise<AdminUserDetail> {
    const user = await this.findManagedUserOrThrow(id);
    if (user.status !== UserStatus.LOCKED) throw new AppException(ErrorCode.USER_NOT_LOCKED);

    const status = statusAfterUnlock(user);
    const { count } = await this.prisma.user.updateMany({
      where: { id, status: UserStatus.LOCKED },
      data: { status },
    });
    if (count === 0) throw new AppException(ErrorCode.USER_NOT_LOCKED);

    await this.tokens.clearUserLocked(id);

    this.audit.setBefore({ status: UserStatus.LOCKED });
    this.audit.setAfter({ status });

    return this.findOne(id);
  }

  async getLoginHistory(
    id: string,
    query: PaginationQueryDto,
  ): Promise<WithMeta<LoginHistoryItem[]>> {
    await this.findManagedUserOrThrow(id);
    return findLoginHistory(this.prisma, id, query);
  }

  /** Tài khoản admin quản lý được (học viên, giáo viên); tài khoản admin trả 403 */
  private async findManagedUserOrThrow(id: string): Promise<DetailRow> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: detailSelect });
    if (!user) throw new AppException(ErrorCode.USER_NOT_FOUND);
    if (!isManagedRole(user.role.code)) throw new AppException(ErrorCode.ADMIN_ACCOUNT_PROTECTED);
    return user;
  }
}

function toListItem({ role, ...user }: ListRow): AdminUserListItem {
  return { ...user, role: role.code as AdminUserListItem['role'] };
}

function toDetail({ passwordHash, googleId, ...user }: DetailRow): AdminUserDetail {
  return {
    ...toListItem(user),
    mustChangePassword: user.mustChangePassword,
    termsAcceptedAt: user.termsAcceptedAt,
    updatedAt: user.updatedAt,
    student: user.student,
    teacher: user.teacher,
    hasPassword: passwordHash !== null,
    googleLinked: googleId !== null,
  };
}

/** Các trường admin sửa được, ghi vào before/after của nhật ký kiểm toán */
function snapshotOf(user: DetailRow): AuditSnapshot {
  return {
    fullName: user.fullName,
    ...(user.student && { targetScore: user.student.targetScore }),
    ...(user.teacher && {
      organization: user.teacher.organization,
      specialization: user.teacher.specialization,
    }),
  };
}
