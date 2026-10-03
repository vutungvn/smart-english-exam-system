import { Body, Controller, Get, HttpStatus, Patch, Query } from '@nestjs/common';
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
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin hồ sơ cá nhân' })
  @ApiEnvelope(MeProfile)
  @ApiErrors(HttpStatus.NOT_FOUND)
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
  @ApiErrors(HttpStatus.FORBIDDEN)
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
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.meService.changePassword(user.id, dto);
  }
}
