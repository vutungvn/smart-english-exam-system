import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { AVATAR_MAX_BYTES, AvatarService } from './avatar.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { InMemoryFile } from '../../common/types/in-memory-file.js';

// Tài khoản bị xóa trong lúc access token vẫn còn hạn
const USER_NOT_FOUND: ApiErrorExample = {
  code: ErrorCode.NOT_FOUND,
  message: 'Tài khoản không còn tồn tại',
};

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly avatarService: AvatarService,
  ) {}

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
    ErrorCode.AUTH_PASSWORD_NOT_SET,
    { code: ErrorCode.BAD_REQUEST, message: 'Mật khẩu mới phải khác mật khẩu hiện tại' },
    USER_NOT_FOUND,
  )
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.meService.changePassword(user.id, dto);
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  // Giữ tệp trong bộ nhớ (không ghi ra đĩa); quá 5 MB thì multer dừng đọc và trả 413
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: AVATAR_MAX_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh JPEG, PNG hoặc WebP, tối đa 5 MB',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Tải lên ảnh đại diện',
    description: 'Server cắt vuông ở giữa, thu về 256×256 WebP và bỏ EXIF; ảnh cũ bị xóa.',
  })
  @ApiEnvelope(MeProfile)
  @ApiErrors(
    ErrorCode.AVATAR_INVALID_IMAGE,
    { code: ErrorCode.AVATAR_INVALID_IMAGE, message: 'Vui lòng chọn một ảnh để tải lên' },
    ErrorCode.PAYLOAD_TOO_LARGE,
    ErrorCode.STORAGE_UNAVAILABLE,
    USER_NOT_FOUND,
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: InMemoryFile | undefined,
  ): Promise<MeProfile> {
    return this.avatarService.upload(user.id, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Xóa ảnh đại diện, quay về hiển thị chữ cái đầu' })
  @ApiEnvelope(MeProfile)
  @ApiErrors(USER_NOT_FOUND)
  removeAvatar(@CurrentUser() user: AuthUser): Promise<MeProfile> {
    return this.avatarService.remove(user.id);
  }
}
