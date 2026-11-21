import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { paginate, toPrismaPage } from '../../common/utils/pagination.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { LoginHistoryItem } from '../me/me.types.js';

/** Lịch sử đăng nhập của một tài khoản, mới nhất trước; dùng chung cho /me và /admin/users */
export async function findLoginHistory(
  prisma: PrismaService,
  userId: string,
  query: PaginationQueryDto,
): Promise<WithMeta<LoginHistoryItem[]>> {
  const where = { userId };

  // Đếm và lấy trang trong cùng transaction để total khớp với dữ liệu trả về.
  // Truy vấn đi theo chỉ mục ix_login_histories_user_created (user_id, created_at DESC).
  const [items, total] = await prisma.$transaction([
    prisma.loginHistory.findMany({
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
    prisma.loginHistory.count({ where }),
  ]);

  return paginate(items, total, query);
}
