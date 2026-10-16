import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RoleCode } from '../../common/constants/roles.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import {
  ApiEnvelope,
  ApiListEnvelope,
  ApiNullEnvelope,
} from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { ApiErrorExample } from '../../common/swagger/api-errors.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import {
  AttemptDetail,
  AttemptResult,
  InProgressAttempt,
  SaveAnswerResult,
  SyncAnswersResult,
} from './attempts.types.js';
import { AttemptsService } from './attempts.service.js';
import { SaveAnswerDto, StartAttemptDto, SyncAnswersDto } from './dto/attempt.dto.js';

const attemptId = () => UuidParam(ErrorCode.ATTEMPT_NOT_FOUND);
const ANSWER_RULE: ApiErrorExample = {
  code: ErrorCode.VALIDATION_ERROR,
  details: [{ field: 'selectedOptionId', message: 'Phương án không thuộc câu hỏi này' }],
};

@ApiTags('Attempts')
@ApiBearerAuth()
@Roles(RoleCode.STUDENT)
@Controller()
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post('exams/:id/attempts')
  @ApiOperation({
    summary: 'Bắt đầu làm bài',
    description:
      'FULL: làm cả đề, expiresAt = bây giờ + thời gian của đề. PART: luyện một Part (gửi sectionId), ' +
      'không đếm giờ. Đang có bài dở cùng kiểu thì trả lại bài đó (200, resumed = true); khác kiểu thì ' +
      '409 ATTEMPT_IN_PROGRESS kèm attemptId. Giới hạn số lượt chỉ tính lượt làm cả đề chưa hủy.',
  })
  @ApiEnvelope(AttemptDetail, { status: HttpStatus.CREATED, description: 'Tạo lượt mới' })
  @ApiEnvelope(AttemptDetail, { description: 'Làm tiếp bài đang dở (resumed = true)' })
  @ApiErrors(
    ErrorCode.EXAM_NOT_FOUND,
    ErrorCode.EXAM_SECTION_NOT_FOUND,
    ErrorCode.ATTEMPT_PART_PRACTICE_DISABLED,
    ErrorCode.ATTEMPT_LIMIT_REACHED,
    {
      code: ErrorCode.ATTEMPT_IN_PROGRESS,
      details: { attemptId: '7d3c…', mode: 'PART', sectionId: '1a2b…' },
    },
    {
      code: ErrorCode.VALIDATION_ERROR,
      details: [{ field: 'sectionId', message: 'Chọn Part muốn luyện' }],
    },
  )
  async startAttempt(
    @Param('id', UuidParam(ErrorCode.EXAM_NOT_FOUND)) examId: string,
    @Body() dto: StartAttemptDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AttemptDetail> {
    const detail = await this.attempts.start(examId, dto, user);
    // Làm tiếp bài dở: không tạo gì mới nên trả 200 thay vì 201
    if (detail.resumed) res.status(HttpStatus.OK);
    return detail;
  }

  @Get('me/attempts/in-progress')
  @ApiOperation({ summary: 'Các bài đang làm dở của tôi (mục "Làm tiếp")' })
  @ApiListEnvelope(InProgressAttempt)
  listInProgressAttempts(@CurrentUser() user: AuthUser): Promise<InProgressAttempt[]> {
    return this.attempts.listInProgress(user);
  }

  @Get('attempts/:id')
  @ApiOperation({
    summary: 'Tải / khôi phục bài làm',
    description:
      'Đề (không đáp án, câu trả lời mẫu, lời thoại), các câu đã trả lời, thời gian còn lại tính ở server.',
  })
  @ApiEnvelope(AttemptDetail)
  @ApiErrors(ErrorCode.ATTEMPT_NOT_FOUND)
  getAttempt(
    @Param('id', attemptId()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AttemptDetail> {
    return this.attempts.detail(id, user);
  }

  @Put('attempts/:id/answers/:examQuestionId')
  @ApiOperation({
    summary: 'Tự động lưu một câu trả lời (idempotent)',
    description:
      'Không gửi trường = giữ nguyên, null = xóa. Chỉ nhận khi bài đang làm và chưa quá hạn nộp 15 giây. ' +
      'Server đã có bản mới hơn (answeredAt) thì giữ bản đó (applied = false). Trả kèm thời gian còn lại.',
  })
  @ApiEnvelope(SaveAnswerResult)
  @ApiErrors(
    ANSWER_RULE,
    ErrorCode.ATTEMPT_NOT_FOUND,
    ErrorCode.ATTEMPT_QUESTION_NOT_FOUND,
    ErrorCode.ATTEMPT_NOT_IN_PROGRESS,
    ErrorCode.ATTEMPT_EXPIRED,
  )
  saveAnswer(
    @Param('id', attemptId()) id: string,
    @Param('examQuestionId', UuidParam(ErrorCode.ATTEMPT_QUESTION_NOT_FOUND))
    examQuestionId: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SaveAnswerResult> {
    return this.attempts.saveAnswer(id, examQuestionId, dto, user);
  }

  @Patch('attempts/:id/answers')
  @ApiOperation({
    summary: 'Đồng bộ lô câu trả lời sau khi mất mạng',
    description:
      'Nhận tới 2 phút sau hạn nộp; câu trả lời có answeredAt sau hạn nộp bị bỏ qua. Một câu sai ' +
      'thì không ghi câu nào (lỗi chỉ rõ answers[i].field).',
  })
  @ApiEnvelope(SyncAnswersResult)
  @ApiErrors(
    {
      code: ErrorCode.VALIDATION_ERROR,
      details: [
        { field: 'answers[3].selectedOptionId', message: 'Phương án không thuộc câu hỏi này' },
      ],
    },
    ErrorCode.ATTEMPT_NOT_FOUND,
    ErrorCode.ATTEMPT_NOT_IN_PROGRESS,
    ErrorCode.ATTEMPT_EXPIRED,
  )
  syncAnswers(
    @Param('id', attemptId()) id: string,
    @Body() dto: SyncAnswersDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SyncAnswersResult> {
    return this.attempts.syncAnswers(id, dto, user);
  }

  @Post('attempts/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nộp bài và chấm phần trắc nghiệm',
    description:
      'Chấm ngay câu trắc nghiệm (đề TOEIC LR làm cả đề quy đổi 10–990, đề luyện tập và luyện theo Part ' +
      'tính %). Đề có câu Speaking/Writing: trạng thái SUBMITTED, scaledScore null chờ AI chấm. Nộp lại ' +
      'bài đã nộp (hoặc đã được tự nộp khi hết giờ) trả về kết quả cũ, không chấm lại.',
  })
  @ApiEnvelope(AttemptResult)
  @ApiErrors(ErrorCode.ATTEMPT_NOT_FOUND, {
    code: ErrorCode.ATTEMPT_NOT_IN_PROGRESS,
    message: 'Bài làm đã hủy, không nộp được',
  })
  submitAttempt(
    @Param('id', attemptId()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AttemptResult> {
    return this.attempts.submit(id, user);
  }

  @Post('attempts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hủy bài đang làm để làm lại',
    description:
      'Lượt đã hủy không tính vào giới hạn số lượt; câu trả lời của lượt đó được giữ lại.',
  })
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.ATTEMPT_NOT_FOUND, ErrorCode.ATTEMPT_NOT_IN_PROGRESS)
  cancelAttempt(
    @Param('id', attemptId()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.attempts.cancel(id, user);
  }
}
