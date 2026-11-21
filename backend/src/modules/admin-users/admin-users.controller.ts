import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiEnvelope, ApiPaginatedEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { LoginHistoryItem } from '../me/me.types.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminUserDetail, AdminUserListItem } from './admin-users.types.js';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { LockUserDto } from './dto/lock-user.dto.js';

const UserId = UuidParam(ErrorCode.USER_NOT_FOUND);

@ApiTags('Admin Users')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách học viên, giáo viên (tìm kiếm, lọc, phân trang)',
    description: 'Tài khoản admin không nằm trong danh sách.',
  })
  @ApiPaginatedEnvelope(AdminUserListItem)
  listAdminUsers(@Query() query: AdminUserQueryDto): Promise<WithMeta<AdminUserListItem[]>> {
    return this.adminUsersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một người dùng kèm hồ sơ theo vai trò' })
  @ApiEnvelope(AdminUserDetail)
  @ApiErrors(ErrorCode.USER_NOT_FOUND, ErrorCode.ADMIN_ACCOUNT_PROTECTED)
  getAdminUser(@Param('id', UserId) id: string): Promise<AdminUserDetail> {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id')
  @Audit('user.update')
  @ApiOperation({
    summary: 'Sửa thông tin người dùng',
    description:
      'targetScore chỉ dành cho học viên; organization, specialization chỉ dành cho giáo viên.',
  })
  @ApiEnvelope(AdminUserDetail)
  @ApiErrors(
    ErrorCode.USER_NOT_FOUND,
    ErrorCode.ADMIN_ACCOUNT_PROTECTED,
    ErrorCode.VERSION_CONFLICT,
    { code: ErrorCode.BAD_REQUEST, message: 'Chỉ giáo viên mới có đơn vị công tác và chuyên môn' },
  )
  updateAdminUser(
    @Param('id', UserId) id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<AdminUserDetail> {
    return this.adminUsersService.update(id, dto);
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @Audit('user.lock')
  @ApiOperation({
    summary: 'Khóa tài khoản',
    description: 'Đăng xuất người dùng khỏi mọi thiết bị ngay lập tức, kể cả access token còn hạn.',
  })
  @ApiEnvelope(AdminUserDetail)
  @ApiErrors(
    ErrorCode.USER_NOT_FOUND,
    ErrorCode.ADMIN_ACCOUNT_PROTECTED,
    ErrorCode.USER_ALREADY_LOCKED,
  )
  lockAdminUser(
    @Param('id', UserId) id: string,
    @Body() dto: LockUserDto,
  ): Promise<AdminUserDetail> {
    return this.adminUsersService.lock(id, dto);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @Audit('user.unlock')
  @ApiOperation({
    summary: 'Mở khóa tài khoản',
    description:
      'Trạng thái sau khi mở: chưa xác minh email → PENDING_VERIFICATION; giáo viên chưa được ' +
      'duyệt → PENDING_APPROVAL; còn lại → ACTIVE.',
  })
  @ApiEnvelope(AdminUserDetail)
  @ApiErrors(ErrorCode.USER_NOT_FOUND, ErrorCode.ADMIN_ACCOUNT_PROTECTED, ErrorCode.USER_NOT_LOCKED)
  unlockAdminUser(@Param('id', UserId) id: string): Promise<AdminUserDetail> {
    return this.adminUsersService.unlock(id);
  }

  @Get(':id/login-history')
  @ApiOperation({ summary: 'Lịch sử đăng nhập của người dùng, mới nhất trước' })
  @ApiPaginatedEnvelope(LoginHistoryItem)
  @ApiErrors(ErrorCode.USER_NOT_FOUND, ErrorCode.ADMIN_ACCOUNT_PROTECTED)
  getAdminUserLoginHistory(
    @Param('id', UserId) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<WithMeta<LoginHistoryItem[]>> {
    return this.adminUsersService.getLoginHistory(id, query);
  }
}
