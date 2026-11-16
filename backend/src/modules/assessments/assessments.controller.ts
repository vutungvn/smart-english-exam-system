import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { AssessmentsService, MAX_REGRADES } from './assessments.service.js';
import { AssessmentReviewRequest, QuestionAssessment } from './assessments.types.js';
import { RequestReviewDto } from './dto/request-review.dto.js';

// Cùng tag với các route làm bài: chấm lại làm mới kết quả, màn xem lại (cache RTK Query theo tag)
@ApiTags('Attempts')
@ApiBearerAuth()
@Roles(RoleCode.STUDENT)
@Controller()
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Post('attempts/:id/assessments/:assessmentId/regrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chấm lại một câu Speaking/Writing bị chấm lỗi',
    description:
      `Chỉ chủ bài làm, chỉ câu FAILED, tối đa ${MAX_REGRADES} lần mỗi câu. Câu về PENDING và được ` +
      'xếp đầu hàng đợi chấm; xem kết quả bằng GET /attempts/{id}/review.',
  })
  @ApiEnvelope(QuestionAssessment)
  @ApiErrors(
    ErrorCode.ASSESSMENT_NOT_FOUND,
    ErrorCode.ASSESSMENT_NOT_FAILED,
    ErrorCode.ASSESSMENT_REGRADE_LIMIT,
    ErrorCode.ASSESSMENT_RECORDING_MISSING,
    ErrorCode.ASSESSMENT_TEACHER_REVIEWED,
  )
  regradeAssessment(
    @Param('id', UuidParam(ErrorCode.ATTEMPT_NOT_FOUND)) id: string,
    @Param('assessmentId', UuidParam(ErrorCode.ASSESSMENT_NOT_FOUND)) assessmentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionAssessment> {
    return this.assessments.regrade(id, assessmentId, user);
  }

  @Post('attempts/:id/assessments/:assessmentId/review-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yêu cầu giáo viên chấm lại một câu Speaking/Writing AI đã chấm',
    description:
      'Chỉ chủ bài làm, chỉ câu AI đã chấm xong (DONE), mỗi câu một lần, kèm lý do. Giáo viên chấm ' +
      'xong thì học viên nhận thông báo và điểm bài làm tính lại theo điểm giáo viên.',
  })
  @ApiEnvelope(AssessmentReviewRequest)
  @ApiErrors(
    ErrorCode.ASSESSMENT_NOT_FOUND,
    ErrorCode.ASSESSMENT_NOT_GRADED,
    ErrorCode.ASSESSMENT_TEACHER_REVIEWED,
    ErrorCode.ASSESSMENT_REVIEW_ALREADY_REQUESTED,
  )
  requestAssessmentReview(
    @Param('id', UuidParam(ErrorCode.ATTEMPT_NOT_FOUND)) id: string,
    @Param('assessmentId', UuidParam(ErrorCode.ASSESSMENT_NOT_FOUND)) assessmentId: string,
    @Body() dto: RequestReviewDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AssessmentReviewRequest> {
    return this.assessments.requestReview(id, assessmentId, user, dto.note);
  }
}
