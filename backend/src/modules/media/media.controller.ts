import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { StorageService } from '../../infra/storage/storage.service.js';
import { IsPublic } from '../../common/decorators/public.decorator.js';
import { AVATAR_CACHE_CONTROL, AVATAR_FILE_PATTERN, AVATAR_KEY_PREFIX } from './media.constants.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Response } from 'express';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  // Công khai vì <img src> không gửi được header Bearer; tên tệp là UUID ngẫu nhiên, không đoán được.
  // Ẩn khỏi Swagger để codegen không sinh hook RTK Query cho route trả ảnh.
  @Get('avatars/:file')
  @IsPublic()
  @ApiExcludeEndpoint()
  async getAvatar(
    @Param('file') file: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!AVATAR_FILE_PATTERN.test(file)) throw new AppException(ErrorCode.NOT_FOUND);

    const object = await this.storage.get(AVATAR_KEY_PREFIX + file);
    if (!object) throw new AppException(ErrorCode.NOT_FOUND);

    // Chỉ gắn cache khi có ảnh: @Header() gắn cả vào 404/503, trình duyệt sẽ nhớ lỗi suốt 1 năm
    res.setHeader('Cache-Control', AVATAR_CACHE_CONTROL);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return new StreamableFile(object.body, {
      type: object.contentType ?? 'image/webp',
      length: object.contentLength,
    });
  }
}
