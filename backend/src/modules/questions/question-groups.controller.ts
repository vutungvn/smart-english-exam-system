import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  BulkDeleteGroupsDto,
  CreateQuestionGroupDto,
  DeleteGroupQueryDto,
  QuestionGroupQueryDto,
  UpdateQuestionGroupDto,
} from './dto/question-group.dto.js';
import { QuestionGroupsService } from './question-groups.service.js';
import {
  GroupBulkDeleteResult,
  QuestionGroupDetail,
  QuestionGroupSummary,
} from './questions.types.js';

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

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa nhiều nhóm câu (tối đa 100)',
    description:
      'withQuestions = true thì xóa luôn các câu trong nhóm. Bỏ qua kèm lý do: NOT_FOUND, NOT_OWNER, ' +
      'NOT_EMPTY (còn câu mà withQuestions = false), IN_PUBLISHED_EXAM (có câu ở đề đã xuất bản).',
  })
  @ApiEnvelope(GroupBulkDeleteResult)
  bulkDeleteQuestionGroups(
    @Body() dto: BulkDeleteGroupsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GroupBulkDeleteResult> {
    return this.groupsService.bulkRemove(dto.ids, dto.withQuestions ?? false, user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa mềm nhóm câu (chỉ người tạo)',
    description:
      'Nhóm còn câu: gửi withQuestions=true để xóa luôn các câu, không thì báo QUESTION_GROUP_NOT_EMPTY.',
  })
  @ApiNullEnvelope()
  @ApiErrors(
    ErrorCode.FORBIDDEN,
    NOT_OWNER,
    ErrorCode.QUESTION_GROUP_NOT_FOUND,
    ErrorCode.QUESTION_GROUP_NOT_EMPTY,
    ErrorCode.QUESTION_IN_PUBLISHED_EXAM,
  )
  deleteQuestionGroup(
    @Param('id', UuidParam(ErrorCode.QUESTION_GROUP_NOT_FOUND)) id: string,
    @Query() query: DeleteGroupQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.groupsService.remove(id, user, query.withQuestions ?? false);
  }
}
