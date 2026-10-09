import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { MeService } from './me.service.js';
import { LoginHistoryItem, MeProfile } from './me.types.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { WithMeta } from '../../common/types/api-response.js';
import {
  ApiEnvelope,
  ApiNullEnvelope,
  ApiPaginatedEnvelope,
} from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { ApiErrorExample } from '../../common/swagger/api-errors.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

// Tài khoản bị xóa trong lúc access token vẫn còn hạn
const USER_NOT_FOUND: ApiErrorExample = {
  code: ErrorCode.NOT_FOUND,
  message: 'Tài khoản không còn tồn tại',
};

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin hồ sơ cá nhân' })
  @ApiEnvelope(MeProfile)
  @ApiErrors(USER_NOT_FOUND)
  getProfile(@CurrentUser() user: AuthUser): Promise<MeProfile> {
    return this.meService.getProfile(user.id);
  }

  @Get('login-history')
  @ApiOperation({ summary: 'Xem lịch sử đăng nhập của chính mình, mới nhất trước' })
  @ApiPaginatedEnvelope(LoginHistoryItem)
  getLoginHistory(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<WithMeta<LoginHistoryItem[]>> {
    return this.meService.getLoginHistory(user.id, query);
  }

  @Patch()
  @ApiOperation({
    summary: 'Cập nhật hồ sơ cá nhân',
    description: 'Trường nào không gửi thì giữ nguyên; targetScore chỉ dành cho học viên.',
  })
  @ApiEnvelope(MeProfile)
  @ApiErrors(
    { code: ErrorCode.FORBIDDEN, message: 'Chỉ học viên mới đặt được điểm mục tiêu' },
    USER_NOT_FOUND,
  )
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<MeProfile> {
    return this.meService.updateProfile(user, dto);
  }

  @Patch('password')
  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description:
      'Thành công thì đăng xuất mọi thiết bị; FE gọi lại POST /auth/login bằng mật khẩu mới.',
  })
  @ApiNullEnvelope()
  @ApiErrors(
    ErrorCode.AUTH_CURRENT_PASSWORD_INCORRECT,
    { code: ErrorCode.BAD_REQUEST, message: 'Mật khẩu mới phải khác mật khẩu hiện tại' },
    USER_NOT_FOUND,
  )
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.meService.changePassword(user.id, dto);
  }
}
