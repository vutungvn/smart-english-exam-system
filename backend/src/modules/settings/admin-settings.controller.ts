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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { ApiEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { SETTING_GROUPS } from '../../infra/settings/settings.schema.js';
import {
  RecordingImpactQueryDto,
  ResetSettingsDto,
  UpdateAiSettingsDto,
  UpdateRecordingSettingsDto,
  UpdateScoringSettingsDto,
} from './dto/settings.dto.js';
import { SettingsService } from './settings.service.js';
import { AdminSettings, RecordingImpact } from './settings.types.js';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Cấu hình hệ thống: giá trị, mặc định, khoảng hợp lệ của từng nhóm' })
  @ApiEnvelope(AdminSettings)
  getAdminSettings(): Promise<AdminSettings> {
    return this.settingsService.findAll();
  }

  @Get('recording/impact')
  @ApiOperation({ summary: 'Số bản ghi âm sẽ bị xóa nếu đổi số ngày giữ' })
  @ApiEnvelope(RecordingImpact)
  getRecordingImpact(@Query() query: RecordingImpactQueryDto): Promise<RecordingImpact> {
    return this.settingsService.recordingImpact(query.retentionDays);
  }

  @Patch('scoring')
  @Audit('setting.update')
  @ApiOperation({
    summary: 'Sửa bảng quy đổi điểm TOEIC',
    description: 'Chỉ áp dụng cho bài chấm sau khi lưu, không tính lại điểm cũ.',
  })
  @ApiEnvelope(AdminSettings)
  @ApiErrors(ErrorCode.VERSION_CONFLICT)
  updateScoringSettings(
    @Body() dto: UpdateScoringSettingsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AdminSettings> {
    return this.settingsService.update('scoring', dto, user.id);
  }

  @Patch('ai')
  @Audit('setting.update')
  @ApiOperation({ summary: 'Sửa hạn mức AI', description: 'Có hiệu lực ngay trong ngày.' })
  @ApiEnvelope(AdminSettings)
  @ApiErrors(ErrorCode.VERSION_CONFLICT)
  updateAiSettings(
    @Body() dto: UpdateAiSettingsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AdminSettings> {
    return this.settingsService.update('ai', dto, user.id);
  }

  @Patch('recording')
  @Audit('setting.update')
  @ApiOperation({
    summary: 'Sửa số ngày giữ bản ghi âm Speaking',
    description: 'Áp dụng cả bản ghi cũ: giảm số ngày thì bản ghi quá hạn bị xóa lúc 3 giờ sáng.',
  })
  @ApiEnvelope(AdminSettings)
  @ApiErrors(ErrorCode.VERSION_CONFLICT)
  updateRecordingSettings(
    @Body() dto: UpdateRecordingSettingsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AdminSettings> {
    return this.settingsService.update('recording', dto, user.id);
  }

  @Post(':group/reset')
  @HttpCode(HttpStatus.OK)
  @Audit('setting.reset')
  @ApiOperation({ summary: 'Khôi phục mặc định một nhóm cấu hình' })
  @ApiParam({ name: 'group', enum: SETTING_GROUPS, enumName: 'SettingGroup' })
  @ApiEnvelope(AdminSettings)
  @ApiErrors(ErrorCode.SETTING_GROUP_NOT_FOUND, ErrorCode.VERSION_CONFLICT)
  resetSettings(
    @Param('group') group: string,
    @Body() dto: ResetSettingsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AdminSettings> {
    return this.settingsService.reset(group, dto.updatedAt, user.id);
  }
}
