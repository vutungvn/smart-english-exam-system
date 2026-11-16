import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ApiEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { ProgressSkillsQueryDto, ScoreTrendQueryDto } from './dto/progress-query.dto.js';
import { ProgressService } from './progress.service.js';
import { ProgressSkills, ScoreTrend } from './progress.types.js';

@ApiTags('Progress')
@ApiBearerAuth()
@Roles(RoleCode.STUDENT)
@Controller('me/progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('score-trend')
  @ApiOperation({
    summary: 'Điểm các bài đã nộp theo thời gian (biểu đồ)',
    description:
      'Cũ nhất trước. Mỗi điểm có scaledScore (TOEIC 10–990 hoặc %, null khi còn câu chờ AI chấm), ' +
      'choicePercent (% câu trắc nghiệm đúng, luôn có) và điểm từng kỹ năng; kèm targetScore của học viên.',
  })
  @ApiEnvelope(ScoreTrend)
  getScoreTrend(
    @Query() query: ScoreTrendQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ScoreTrend> {
    return this.progress.scoreTrend(query, user);
  }

  @Get('skills')
  @ApiOperation({
    summary: 'Năng lực theo kỹ năng, Part, chủ đề',
    description:
      'Tính trên câu trắc nghiệm của các bài đã nộp (câu bỏ trống tính là sai). Chủ đề yếu: đã làm ' +
      '≥ 5 câu và đúng dưới 80%, yếu nhất trước, tối đa 5 chủ đề.',
  })
  @ApiEnvelope(ProgressSkills)
  getProgressSkills(
    @Query() query: ProgressSkillsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ProgressSkills> {
    return this.progress.skills(query, user);
  }
}
