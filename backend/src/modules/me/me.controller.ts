import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { MeService } from './me.service.js';
import { MeProfile } from './me.types.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin hồ sơ cá nhân' })
  getProfile(@CurrentUser() user: AuthUser): Promise<MeProfile> {
    return this.meService.getProfile(user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Cập nhật hồ sơ cá nhân',
    description: 'Trường nào không gửi thì giữ nguyên; targetScore chỉ dành cho học viên.',
  })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<MeProfile> {
    return this.meService.updateProfile(user, dto);
  }

  @Patch('password')
  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description:
      'Thành công thì đăng xuất mọi thiết bị; FE gọi lại POST /auth/login bằng mật khẩu mới.',
  })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.meService.changePassword(user.id, dto);
  }
}
