import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { InMemoryFile } from '../../common/types/in-memory-file.js';
import { QuestionStatus } from '../../generated/prisma/enums.js';
import { ConfirmImportDto } from './dto/confirm-import.dto.js';
import { IMPORT_LIMITS } from './import-format.js';
import { QuestionImportService } from './question-import.service.js';
import { ImportPreview, ImportResult } from './question-import.types.js';

const ZIP_TYPE = 'application/zip';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const BINARY = { schema: { type: 'string', format: 'binary' } } as const;

@ApiTags('Question Import')
@ApiBearerAuth()
@Roles(RoleCode.TEACHER)
@Controller('teacher/questions/import')
export class QuestionImportController {
  constructor(private readonly importService: QuestionImportService) {}

  @Get('template')
  @ApiOperation({
    summary: 'Tải tệp mẫu .zip',
    description:
      'questions.xlsx (sheet huong_dan, groups, questions có sẵn ví dụ Listening, Reading, Speaking, ' +
      'Writing) và media/ có một ảnh mẫu. Nhập nguyên tệp mẫu sẽ thành công.',
  })
  @ApiProduces(ZIP_TYPE)
  @ApiOkResponse({ description: 'Tệp .zip', content: { [ZIP_TYPE]: BINARY } })
  async getQuestionImportTemplate(): Promise<StreamableFile> {
    return new StreamableFile(await this.importService.getTemplate(), {
      type: ZIP_TYPE,
      disposition: 'attachment; filename="mau-nhap-cau-hoi.zip"',
    });
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  // Giữ tệp trong bộ nhớ, không ghi ra đĩa; quá giới hạn thì multer dừng đọc và trả 413
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: IMPORT_LIMITS.zipBytes, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp .zip gồm questions.xlsx và thư mục media/, tối đa 100 MB',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Tải tệp lên và xem trước',
    description:
      'Kiểm tra toàn bộ tệp, chưa ghi gì vào ngân hàng. Lỗi, cảnh báo chỉ rõ sheet/dòng/cột. ' +
      'Không có lỗi (canConfirm = true) thì gọi /{token}/confirm trong 1 giờ. ' +
      'Mỗi giáo viên chỉ giữ một bản xem trước: tải tệp khác thì bản cũ bị hủy.',
  })
  @ApiEnvelope(ImportPreview)
  @ApiErrors(
    ErrorCode.QUESTION_IMPORT_INVALID_FILE,
    {
      code: ErrorCode.QUESTION_IMPORT_INVALID_FILE,
      message: 'Tệp .zip có tệp mang đường dẫn không hợp lệ (tuyệt đối hoặc chứa ../)',
    },
    ErrorCode.PAYLOAD_TOO_LARGE,
    { code: ErrorCode.PAYLOAD_TOO_LARGE, message: 'Tệp .zip giải nén ra quá 300 MB' },
    ErrorCode.STORAGE_UNAVAILABLE,
  )
  previewQuestionImport(
    @UploadedFile() file: InMemoryFile | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<ImportPreview> {
    return this.importService.preview(file, user);
  }

  @Post(':token/confirm')
  @ApiOperation({
    summary: 'Xác nhận nhập',
    description:
      'Kiểm tra lại tệp với dữ liệu hiện tại, lưu audio/ảnh vào kho rồi ghi mọi nhóm, câu trong ' +
      'một transaction: lỗi thì không câu nào được nhập.',
  })
  @ApiEnvelope(ImportResult, { status: HttpStatus.CREATED })
  @ApiErrors(
    ErrorCode.QUESTION_IMPORT_NOT_FOUND,
    {
      code: ErrorCode.QUESTION_IMPORT_HAS_ERRORS,
      details: [{ sheet: 'questions', row: 5, column: 'correct', message: 'Thiếu đáp án đúng' }],
    },
    ErrorCode.QUESTION_IMPORT_IN_PROGRESS,
    ErrorCode.QUESTION_CODE_TAKEN,
    ErrorCode.STORAGE_UNAVAILABLE,
  )
  confirmQuestionImport(
    @Param('token', UuidParam(ErrorCode.QUESTION_IMPORT_NOT_FOUND)) token: string,
    @Body() dto: ConfirmImportDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ImportResult> {
    return this.importService.confirm(token, dto.status ?? QuestionStatus.DRAFT, user);
  }

  @Get(':token/errors')
  @ApiOperation({
    summary: 'Tải danh sách lỗi, cảnh báo dạng Excel',
    description: 'Đầy đủ mọi dòng lỗi (response xem trước chỉ trả 500 lỗi đầu tiên).',
  })
  @ApiProduces(XLSX_TYPE)
  @ApiOkResponse({ description: 'Tệp .xlsx', content: { [XLSX_TYPE]: BINARY } })
  @ApiErrors(ErrorCode.QUESTION_IMPORT_NOT_FOUND)
  async getQuestionImportErrors(
    @Param('token', UuidParam(ErrorCode.QUESTION_IMPORT_NOT_FOUND)) token: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.importService.issuesFile(token, user), {
      type: XLSX_TYPE,
      disposition: 'attachment; filename="loi-nhap-cau-hoi.xlsx"',
    });
  }
}
