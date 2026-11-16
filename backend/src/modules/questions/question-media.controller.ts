import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UploadedFile,
  UseInterceptors,
  type PipeTransform,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { fieldError } from '../../common/errors/field-error.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { ApiErrorExample } from '../../common/swagger/api-errors.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { InMemoryFile } from '../../common/types/in-memory-file.js';
import { MEDIA_KINDS, MEDIA_LIMITS, type MediaKind } from './question-media.js';
import { QuestionMediaService } from './question-media.service.js';
import { QuestionDetail, QuestionGroupDetail } from './questions.types.js';

/** :kind trên URL chỉ nhận audio hoặc image */
class MediaKindPipe implements PipeTransform<string, MediaKind> {
  transform(value: string): MediaKind {
    if ((MEDIA_KINDS as readonly string[]).includes(value)) return value as MediaKind;
    throw fieldError('kind', 'Loại tệp phải là audio hoặc image');
  }
}

const KIND_PARAM = ApiParam({ name: 'kind', enum: MEDIA_KINDS, description: 'audio hoặc image' });
const FILE_BODY = ApiBody({
  schema: {
    type: 'object',
    required: ['file'],
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'audio: MP3 tối đa 20 MB · image: JPG, PNG, WebP tối đa 5 MB',
      },
    },
  },
});
// Multer dừng đọc ở mức lớn nhất (audio); ảnh quá 5 MB do service chặn
const UPLOAD = FileInterceptor('file', { limits: { fileSize: MEDIA_LIMITS.audio, files: 1 } });

const PART_ERROR: ApiErrorExample = {
  code: ErrorCode.VALIDATION_ERROR,
  details: [
    { field: 'kind', message: 'Reading Part 5 (Incomplete Sentences) không dùng tệp âm thanh' },
  ],
};
const NOT_OWNER: ApiErrorExample = {
  code: ErrorCode.FORBIDDEN,
  message: 'Chỉ giáo viên tạo ra mới được sửa hoặc xóa',
};
const UPLOAD_ERRORS = [
  PART_ERROR,
  ErrorCode.MEDIA_INVALID_FILE,
  ErrorCode.PAYLOAD_TOO_LARGE,
  ErrorCode.STORAGE_UNAVAILABLE,
  NOT_OWNER,
] as const;
/** Câu, nhóm đang được làm bài (D29): không đổi được âm thanh, hình ảnh */
const LOCK_ERRORS = [
  ErrorCode.QUESTION_IN_PUBLISHED_EXAM,
  ErrorCode.QUESTION_IN_ACTIVE_ATTEMPT,
] as const;

/**
 * Tải audio/ảnh lên ngay trong form câu hỏi và trang nhóm câu (ngoài cách nhập tệp .zip).
 * Tải tệp mới thì thay tệp cũ; trả về câu/nhóm đã cập nhật (có updatedAt mới cho lần lưu form sau).
 */
@ApiTags('Questions')
@ApiBearerAuth()
@Roles(RoleCode.TEACHER)
@Controller('teacher/questions')
export class QuestionMediaController {
  constructor(private readonly media: QuestionMediaService) {}

  @Put(':id/media/:kind')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(UPLOAD)
  @ApiConsumes('multipart/form-data')
  @KIND_PARAM
  @FILE_BODY
  @ApiOperation({
    summary: 'Tải audio hoặc ảnh cho câu hỏi (thay tệp cũ)',
    description:
      'Chỉ Part dùng loại tệp đó: audio cho L1, L2, S3, S4; ảnh cho L1, S2, W1. ' +
      'Định dạng nhận theo nội dung tệp.',
  })
  @ApiEnvelope(QuestionDetail)
  @ApiErrors(...UPLOAD_ERRORS, ...LOCK_ERRORS, ErrorCode.QUESTION_NOT_FOUND)
  uploadQuestionMedia(
    @Param('id', UuidParam(ErrorCode.QUESTION_NOT_FOUND)) id: string,
    @Param('kind', new MediaKindPipe()) kind: MediaKind,
    @UploadedFile() file: InMemoryFile | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionDetail> {
    return this.media.uploadToQuestion(id, kind, file, user);
  }

  @Delete(':id/media/:kind')
  @KIND_PARAM
  @ApiOperation({ summary: 'Gỡ audio hoặc ảnh khỏi câu hỏi' })
  @ApiEnvelope(QuestionDetail)
  @ApiErrors(NOT_OWNER, ...LOCK_ERRORS, ErrorCode.QUESTION_NOT_FOUND)
  removeQuestionMedia(
    @Param('id', UuidParam(ErrorCode.QUESTION_NOT_FOUND)) id: string,
    @Param('kind', new MediaKindPipe()) kind: MediaKind,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionDetail> {
    return this.media.removeFromQuestion(id, kind, user);
  }
}

@ApiTags('Question Groups')
@ApiBearerAuth()
@Roles(RoleCode.TEACHER)
@Controller('teacher/question-groups')
export class QuestionGroupMediaController {
  constructor(private readonly media: QuestionMediaService) {}

  @Put(':id/media/:kind')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(UPLOAD)
  @ApiConsumes('multipart/form-data')
  @KIND_PARAM
  @FILE_BODY
  @ApiOperation({
    summary: 'Tải audio hoặc ảnh cho nhóm câu (thay tệp cũ)',
    description: 'Audio cho nhóm L3, L4; ảnh cho nhóm L3, L4, R6, R7, S4.',
  })
  @ApiEnvelope(QuestionGroupDetail)
  @ApiErrors(...UPLOAD_ERRORS, ...LOCK_ERRORS, ErrorCode.QUESTION_GROUP_NOT_FOUND)
  uploadQuestionGroupMedia(
    @Param('id', UuidParam(ErrorCode.QUESTION_GROUP_NOT_FOUND)) id: string,
    @Param('kind', new MediaKindPipe()) kind: MediaKind,
    @UploadedFile() file: InMemoryFile | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionGroupDetail> {
    return this.media.uploadToGroup(id, kind, file, user);
  }

  @Delete(':id/media/:kind')
  @KIND_PARAM
  @ApiOperation({ summary: 'Gỡ audio hoặc ảnh khỏi nhóm câu' })
  @ApiEnvelope(QuestionGroupDetail)
  @ApiErrors(NOT_OWNER, ...LOCK_ERRORS, ErrorCode.QUESTION_GROUP_NOT_FOUND)
  removeQuestionGroupMedia(
    @Param('id', UuidParam(ErrorCode.QUESTION_GROUP_NOT_FOUND)) id: string,
    @Param('kind', new MediaKindPipe()) kind: MediaKind,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionGroupDetail> {
    return this.media.removeFromGroup(id, kind, user);
  }
}
