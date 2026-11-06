import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { StorageService } from '../../infra/storage/storage.service.js';
import { IsPublic } from '../../common/decorators/public.decorator.js';
import {
  AVATAR_CACHE_CONTROL,
  AVATAR_FILE_PATTERN,
  AVATAR_KEY_PREFIX,
  QUESTION_MEDIA_FILE_PATTERN,
  QUESTION_MEDIA_KEY_PREFIX,
  QUESTION_MEDIA_TYPES,
  RECORDING_FILE_PATTERN,
  RECORDING_KEY_PREFIX,
  type QuestionMediaExt,
} from './media.constants.js';
import { MediaUrlService } from './media-url.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Response } from 'express';

// Một khoảng byte duy nhất ("bytes=0-1023", "bytes=1024-", "bytes=-500"). Nhiều khoảng hoặc sai
// cú pháp thì bỏ qua header và trả cả tệp, đúng như RFC 9110 cho phép
const SINGLE_RANGE = /^bytes=(\d+-\d*|-\d+)$/;

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly storage: StorageService,
    private readonly mediaUrls: MediaUrlService,
  ) {}

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

  /**
   * Audio, ảnh của câu hỏi. Quyền đã kiểm tra lúc API phát URL ký (MediaUrlService), ở đây chỉ
   * kiểm tra chữ ký và hạn dùng. Hỗ trợ HTTP Range để thẻ <audio> tua được.
   */
  @Get('questions/:file')
  @IsPublic()
  @ApiExcludeEndpoint()
  async getQuestionMedia(
    @Param('file') fileParam: string,
    @Query('exp') exp: unknown,
    @Query('sig') sig: unknown,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const match = QUESTION_MEDIA_FILE_PATTERN.exec(fileParam);
    if (!match) throw new AppException(ErrorCode.NOT_FOUND);
    // Tên tệp trong kho, cũng là chuỗi đã ký: <uuid>.<đuôi>
    const file = `${match[1]}.${match[2]}`;
    if (!this.mediaUrls.verify(file, exp, sig)) {
      throw new AppException(ErrorCode.MEDIA_LINK_INVALID);
    }

    const object = await this.storage.get(QUESTION_MEDIA_KEY_PREFIX + file, {
      range: range && SINGLE_RANGE.test(range) ? range : undefined,
    });
    if (!object) throw new AppException(ErrorCode.NOT_FOUND);

    res.setHeader('Accept-Ranges', 'bytes');
    // private: proxy dùng chung không được giữ tệp. Tệp không bao giờ đổi nội dung (tên UUID, thay
    // tệp là key mới) nên trình duyệt giữ suốt hạn URL (4 giờ) và không hỏi lại server (immutable)
    res.setHeader('Cache-Control', 'private, max-age=14400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (object.contentRange) {
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.setHeader('Content-Range', object.contentRange);
    }

    return new StreamableFile(object.body, {
      // Content-Type lấy theo đuôi do hệ thống đặt (đã kiểm tra nội dung lúc nhập)
      type: QUESTION_MEDIA_TYPES[match[2] as QuestionMediaExt],
      length: object.contentLength,
    });
  }

  /**
   * Bài nói Speaking của học viên (MP3). Như media câu hỏi: quyền kiểm tra lúc phát URL ký (chỉ
   * API bài làm của chính học viên), ở đây chỉ kiểm tra chữ ký và hạn dùng; hỗ trợ HTTP Range
   */
  @Get('recordings/:file')
  @IsPublic()
  @ApiExcludeEndpoint()
  async getRecording(
    @Param('file') fileParam: string,
    @Query('exp') exp: unknown,
    @Query('sig') sig: unknown,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const match = RECORDING_FILE_PATTERN.exec(fileParam);
    if (!match) throw new AppException(ErrorCode.NOT_FOUND);
    const key = `${RECORDING_KEY_PREFIX}${match[1]}.mp3`;
    if (!this.mediaUrls.verify(key, exp, sig)) {
      throw new AppException(ErrorCode.MEDIA_LINK_INVALID);
    }

    const object = await this.storage.get(key, {
      range: range && SINGLE_RANGE.test(range) ? range : undefined,
    });
    if (!object) throw new AppException(ErrorCode.NOT_FOUND);

    res.setHeader('Accept-Ranges', 'bytes');
    // Ghi âm lại là key mới nên tệp không đổi nội dung; private: proxy dùng chung không được giữ
    res.setHeader('Cache-Control', 'private, max-age=14400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (object.contentRange) {
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.setHeader('Content-Range', object.contentRange);
    }

    return new StreamableFile(object.body, { type: 'audio/mpeg', length: object.contentLength });
  }
}
