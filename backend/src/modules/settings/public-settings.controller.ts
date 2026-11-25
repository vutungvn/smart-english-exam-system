import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/decorators/public.decorator.js';
import { ApiEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { SettingsService } from './settings.service.js';
import { PublicSettings } from './settings.types.js';

// Tham số hiện cho khách và học viên (landing, FAQ, hộp thoại đồng ý ghi âm), không có gì nhạy cảm
@ApiTags('Settings')
@IsPublic()
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Cấu hình công khai' })
  @ApiEnvelope(PublicSettings)
  getPublicSettings(): Promise<PublicSettings> {
    return this.settingsService.findPublic();
  }
}
