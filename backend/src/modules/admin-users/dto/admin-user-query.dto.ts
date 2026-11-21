import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { UserStatus } from '../../../generated/prisma/enums.js';
import { MANAGED_ROLES, type ManagedRole } from '../admin-users.rules.js';

export const ADMIN_USER_SORTS = [
  'createdAt:desc',
  'createdAt:asc',
  'lastLoginAt:desc',
  'lastLoginAt:asc',
  'fullName:asc',
  'fullName:desc',
  'email:asc',
  'email:desc',
] as const;
export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];

// GET /admin/users: chỉ học viên và giáo viên, tài khoản admin không nằm trong danh sách
export class AdminUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo họ tên hoặc email (không phân biệt hoa thường)' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'q phải là chuỗi' })
  @MaxLength(100, { message: 'Từ khóa tối đa 100 ký tự' })
  q?: string;

  @ApiPropertyOptional({ enum: MANAGED_ROLES, enumName: 'ManagedRole' })
  @IsOptional()
  @IsIn(MANAGED_ROLES, { message: `role thuộc: ${MANAGED_ROLES.join(', ')}` })
  role?: ManagedRole;

  @ApiPropertyOptional({ enum: UserStatus, enumName: 'UserStatus' })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'status không hợp lệ' })
  status?: UserStatus;

  @ApiPropertyOptional({ enum: ADMIN_USER_SORTS, default: 'createdAt:desc' })
  @IsOptional()
  @IsIn(ADMIN_USER_SORTS, { message: `sort thuộc: ${ADMIN_USER_SORTS.join(', ')}` })
  sort: AdminUserSort = 'createdAt:desc';
}
