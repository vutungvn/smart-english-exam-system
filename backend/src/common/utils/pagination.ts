import type { PaginationQueryDto } from '../dto/pagination-query.dto.js';
import { WithMeta } from '../types/api-response.js';

// Dùng type thay vì interface: interface không gán được vào ResponseMeta (Record<string, unknown>)
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** Đổi page/limit thành skip/take cho Prisma findMany */
export function toPrismaPage({ page, limit }: PaginationQueryDto): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

/** Bọc một trang dữ liệu kèm meta phân trang; TransformInterceptor trả ra { success, status, data, meta } */
export function paginate<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationQueryDto,
): WithMeta<T[]> {
  const meta: PaginationMeta = { page, limit, total, totalPages: Math.ceil(total / limit) };
  return new WithMeta(items, meta);
}
