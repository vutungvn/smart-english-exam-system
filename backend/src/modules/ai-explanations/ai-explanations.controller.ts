import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { AiExplanation, AiQuotas } from './ai-explanations.types.js';
import { AiExplanationsService } from './ai-explanations.service.js';

@ApiTags('AI Explanations')
@ApiBearerAuth()
@Roles(RoleCode.STUDENT)
@Controller()
export class AiExplanationsController {
  constructor(private readonly explanations: AiExplanationsService) {}

  @Get('attempts/:id/questions/:examQuestionId/ai-explanation')
  @ApiOperation({
    summary: 'Giải thích đáp án bằng AI',
    description:
      'Chỉ câu trắc nghiệm (Listening, Reading) của bài đã nộp, của chính học viên. Lời giải thích ' +
      'dùng chung mọi học viên: đã có (cached = true) thì trả ngay, không tính lượt; chưa có hoặc ' +
      'giáo viên đã sửa câu thì gọi AI, tính 1 lượt (mặc định 20 lượt/ngày). Kèm số lượt còn lại.',
  })
  @ApiEnvelope(AiExplanation)
  @ApiErrors(
    ErrorCode.ATTEMPT_NOT_FOUND,
    ErrorCode.ATTEMPT_NOT_SUBMITTED,
    ErrorCode.ATTEMPT_QUESTION_NOT_FOUND,
    ErrorCode.AI_EXPLANATION_NOT_SUPPORTED,
    ErrorCode.AI_QUOTA_EXCEEDED,
    ErrorCode.AI_UNAVAILABLE,
  )
  getAiExplanation(
    @Param('id', UuidParam(ErrorCode.ATTEMPT_NOT_FOUND)) id: string,
    @Param('examQuestionId', UuidParam(ErrorCode.ATTEMPT_QUESTION_NOT_FOUND))
    examQuestionId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AiExplanation> {
    return this.explanations.explain(id, examQuestionId, user);
  }

  @Get('me/ai-quotas')
  @ApiOperation({
    summary: 'Lượt dùng AI hôm nay của học viên',
    description: 'Ngày tính theo giờ Thái Bình Dương như hạn mức của Gemini (resetAt).',
  })
  @ApiEnvelope(AiQuotas)
  getMyAiQuotas(@CurrentUser() user: AuthUser): Promise<AiQuotas> {
    return this.explanations.quotas(user);
  }
}
