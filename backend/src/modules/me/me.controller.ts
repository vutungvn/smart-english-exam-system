import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { MeService } from './me.service.js';
import { MeProfile } from './me.types.js';

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
}
