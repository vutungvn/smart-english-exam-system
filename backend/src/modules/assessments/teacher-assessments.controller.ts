import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiEnvelope, ApiPaginatedEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { WithMeta } from '../../common/types/api-response.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import {
  AgreementQueryDto,
  CalibrationQueryDto,
  GradeAnswerDto,
  TeacherAssessmentDetailQueryDto,
  TeacherAssessmentQueryDto,
} from './dto/teacher-assessment.dto.js';
import { TeacherAssessmentsService } from './teacher-assessments.service.js';
import {
  AgreementStats,
  CalibrationSample,
  TeacherReviewDetail,
  TeacherReviewItem,
} from './teacher-assessments.types.js';

// Giáo viên xem lại và sửa điểm AI chấm Speaking/Writing (SPRINT-91). Mọi giáo viên chấm được mọi
// đề (tổ chấm chung); SPRINT-67 đổi sang quyền assessments.UPDATE
@ApiTags('Teacher Assessments')
@ApiBearerAuth()
@Roles(RoleCode.TEACHER)
@Controller('teacher/assessments')
export class TeacherAssessmentsController {
  constructor(private readonly assessments: TeacherAssessmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Hàng đợi bài cần chấm lại',
    description:
      'tab=WAITING: câu AI chấm lỗi hoặc học viên yêu cầu, giáo viên chưa chấm (bài nộp lâu nhất ' +
      'trước) · tab=REVIEWED: câu giáo viên đã chấm (mới nhất trước). Học viên hiện bằng mã ẩn danh.',
  })
  @ApiPaginatedEnvelope(TeacherReviewItem)
  listTeacherAssessments(
    @CurrentUser() user: AuthUser,
    @Query() query: TeacherAssessmentQueryDto,
  ): Promise<WithMeta<TeacherReviewItem[]>> {
    return this.assessments.list(user, query);
  }

  // Route tĩnh khai báo trước :answerId
  @Get('calibration/next')
  @ApiOperation({
    summary: 'Câu tiếp theo để chấm đối chiếu (SPRINT-90)',
    description:
      'Chọn ngẫu nhiên một câu AI đã chấm xong mà chưa giáo viên nào chấm. Mở bằng ' +
      'GET /teacher/assessments/{answerId}?blind=true để ẩn điểm AI, lưu kèm blind: true.',
  })
  @ApiEnvelope(CalibrationSample)
  getNextCalibration(
    @CurrentUser() user: AuthUser,
    @Query() query: CalibrationQueryDto,
  ): Promise<CalibrationSample> {
    return this.assessments.nextCalibration(user, query);
  }

  @Get('agreement')
  @ApiOperation({
    summary: 'Độ lệch điểm AI so với giáo viên (SPRINT-90)',
    description:
      'Trên các câu có cả bản AI và bản giáo viên: độ lệch tuyệt đối trung bình (MAE), độ lệch có ' +
      'dấu, tỉ lệ khớp, lệch ≤ 1 điểm; toàn bộ, theo kỹ năng, theo Part, kèm danh sách cặp điểm.',
  })
  @ApiEnvelope(AgreementStats)
  getAssessmentAgreement(
    @CurrentUser() user: AuthUser,
    @Query() query: AgreementQueryDto,
  ): Promise<AgreementStats> {
    return this.assessments.agreement(user, query);
  }

  @Get(':answerId')
  @ApiOperation({
    summary: 'Chi tiết một câu để chấm: đề, bài làm, bản AI, bản giáo viên',
    description: 'blind=true (chấm đối chiếu): ẩn bản AI khi giáo viên chưa chấm câu này.',
  })
  @ApiEnvelope(TeacherReviewDetail)
  @ApiErrors(ErrorCode.ASSESSMENT_NOT_FOUND)
  getTeacherAssessment(
    @Param('answerId', UuidParam(ErrorCode.ASSESSMENT_NOT_FOUND)) answerId: string,
    @Query() query: TeacherAssessmentDetailQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherReviewDetail> {
    return this.assessments.detail(answerId, user, query.blind === 'true');
  }

  @Put(':answerId')
  @ApiOperation({
    summary: 'Chấm hoặc sửa điểm một câu Speaking/Writing',
    description:
      'Tạo/sửa bản giáo viên (điểm chính thức, bản AI giữ để đối chiếu), tính lại điểm bài làm ' +
      '(kể cả bài đã có điểm) và gửi thông báo cho học viên. Sửa bản đã chấm phải gửi updatedAt; ' +
      'giáo viên khác vừa chấm thì 409 VERSION_CONFLICT.',
  })
  @ApiEnvelope(TeacherReviewDetail)
  @ApiErrors(
    ErrorCode.ASSESSMENT_NOT_FOUND,
    ErrorCode.ASSESSMENT_SCORE_OUT_OF_RANGE,
    ErrorCode.VERSION_CONFLICT,
  )
  gradeTeacherAssessment(
    @Param('answerId', UuidParam(ErrorCode.ASSESSMENT_NOT_FOUND)) answerId: string,
    @Body() dto: GradeAnswerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherReviewDetail> {
    return this.assessments.grade(answerId, user, dto);
  }
}
