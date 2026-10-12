import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import {
  ApiEnvelope,
  ApiNullEnvelope,
  ApiPaginatedEnvelope,
} from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { ApiErrorExample } from '../../common/swagger/api-errors.decorator.js';
import type { WithMeta } from '../../common/types/api-response.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import {
  CreateQuestionGroupDto,
  QuestionGroupQueryDto,
  UpdateQuestionGroupDto,
} from './dto/question-group.dto.js';
import { QuestionGroupsService } from './question-groups.service.js';
import { QuestionGroupDetail, QuestionGroupSummary } from './questions.types.js';

const RULE_ERROR: ApiErrorExample = {
  code: ErrorCode.VALIDATION_ERROR,
  details: [
    {
      field: 'transcript',
      message: 'Nhóm Listening Part 3 (Conversations) cần lời thoại (transcript)',
    },
  ],
};
const NOT_OWNER: ApiErrorExample = {
  code: ErrorCode.FORBIDDEN,
  message: 'Chỉ giáo viên tạo ra mới được sửa hoặc xóa',
};

@ApiTags('Question Groups')
@ApiBearerAuth()
@Roles(RoleCode.TEACHER)
@Controller('teacher/question-groups')
export class QuestionGroupsController {
  constructor(private readonly groupsService: QuestionGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhóm câu (Listening 3, 4; Reading 6, 7; Speaking 4)' })
  @ApiPaginatedEnvelope(QuestionGroupSummary)
  listQuestionGroups(
    @Query() query: QuestionGroupQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<WithMeta<QuestionGroupSummary[]>> {
    return this.groupsService.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhóm kèm các câu trong nhóm' })
  @ApiEnvelope(QuestionGroupDetail)
  @ApiErrors(ErrorCode.QUESTION_GROUP_NOT_FOUND)
  getQuestionGroup(
    @Param('id', UuidParam(ErrorCode.QUESTION_GROUP_NOT_FOUND)) id: string,
  ): Promise<QuestionGroupDetail> {
    return this.groupsService.get(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo nhóm câu',
    description:
      'Tạo nhóm trước, rồi thêm câu bằng POST /teacher/questions với groupId, orderInGroup.',
  })
  @ApiEnvelope(QuestionGroupDetail, { status: HttpStatus.CREATED })
  @ApiErrors(RULE_ERROR)
  createQuestionGroup(
    @Body() dto: CreateQuestionGroupDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionGroupDetail> {
    return this.groupsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa nhóm câu (chỉ người tạo; không đổi được kỹ năng, Part)' })
  @ApiEnvelope(QuestionGroupDetail)
  @ApiErrors(
    RULE_ERROR,
    ErrorCode.FORBIDDEN,
    NOT_OWNER,
    ErrorCode.QUESTION_GROUP_NOT_FOUND,
    ErrorCode.VERSION_CONFLICT,
  )
  updateQuestionGroup(
    @Param('id', UuidParam(ErrorCode.QUESTION_GROUP_NOT_FOUND)) id: string,
    @Body() dto: UpdateQuestionGroupDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionGroupDetail> {
    return this.groupsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm nhóm câu (chỉ khi nhóm không còn câu nào)' })
  @ApiNullEnvelope()
  @ApiErrors(
    ErrorCode.FORBIDDEN,
    NOT_OWNER,
    ErrorCode.QUESTION_GROUP_NOT_FOUND,
    ErrorCode.QUESTION_GROUP_NOT_EMPTY,
  )
  deleteQuestionGroup(
    @Param('id', UuidParam(ErrorCode.QUESTION_GROUP_NOT_FOUND)) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.groupsService.remove(id, user);
  }
}
