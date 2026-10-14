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
import { BulkDeleteResult, BulkIdsDto } from '../../common/dto/bulk-delete.dto.js';
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
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { QuestionQueryDto } from './dto/question-query.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { QuestionsService } from './questions.service.js';
import { QuestionDetail, QuestionSummary } from './questions.types.js';

// Ví dụ lỗi nghiệp vụ trả dạng VALIDATION_ERROR gắn trường (xem question-rules.ts)
const RULE_ERROR: ApiErrorExample = {
  code: ErrorCode.VALIDATION_ERROR,
  details: [
    { field: 'options', message: 'Listening Part 2 (Question-Response) cần đúng 3 phương án' },
  ],
};
const NOT_OWNER: ApiErrorExample = {
  code: ErrorCode.FORBIDDEN,
  message: 'Chỉ giáo viên tạo ra mới được sửa hoặc xóa',
};

@ApiTags('Questions')
@ApiBearerAuth()
@Roles(RoleCode.TEACHER)
@Controller('teacher/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Tìm, lọc câu hỏi trong ngân hàng (dùng chung cho mọi giáo viên)' })
  @ApiPaginatedEnvelope(QuestionSummary)
  listQuestions(
    @Query() query: QuestionQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<WithMeta<QuestionSummary[]>> {
    return this.questionsService.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết câu hỏi kèm phương án' })
  @ApiEnvelope(QuestionDetail)
  @ApiErrors(ErrorCode.QUESTION_NOT_FOUND)
  getQuestion(
    @Param('id', UuidParam(ErrorCode.QUESTION_NOT_FOUND)) id: string,
  ): Promise<QuestionDetail> {
    return this.questionsService.get(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo câu hỏi',
    description:
      'Kiểm tra theo TOEIC_PARTS: loại câu của Part, số phương án và đúng 1 đáp án đúng (trắc nghiệm), ' +
      'câu trả lời mẫu và thời gian (Speaking), câu thuộc nhóm hay câu đơn, chủ đề đúng kỹ năng/Part.',
  })
  @ApiEnvelope(QuestionDetail, { status: HttpStatus.CREATED })
  @ApiErrors(
    RULE_ERROR,
    ErrorCode.FORBIDDEN,
    { code: ErrorCode.FORBIDDEN, message: 'Chỉ thêm câu vào nhóm do bạn tạo' },
    ErrorCode.QUESTION_GROUP_ORDER_TAKEN,
  )
  createQuestion(
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionDetail> {
    return this.questionsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Sửa câu hỏi (chỉ người tạo)',
    description: 'Trường không gửi thì giữ nguyên; gửi options thì thay toàn bộ phương án.',
  })
  @ApiEnvelope(QuestionDetail)
  @ApiErrors(
    RULE_ERROR,
    ErrorCode.FORBIDDEN,
    NOT_OWNER,
    ErrorCode.QUESTION_NOT_FOUND,
    ErrorCode.VERSION_CONFLICT,
    ErrorCode.QUESTION_GROUP_ORDER_TAKEN,
  )
  updateQuestion(
    @Param('id', UuidParam(ErrorCode.QUESTION_NOT_FOUND)) id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionDetail> {
    return this.questionsService.update(id, dto, user);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa nhiều câu (tối đa 100)',
    description:
      'Câu hợp lệ bị xóa mềm; câu không tồn tại (NOT_FOUND), của giáo viên khác (NOT_OWNER), ' +
      'đang ở đề đã xuất bản (IN_PUBLISHED_EXAM) bị bỏ qua kèm lý do.',
  })
  @ApiEnvelope(BulkDeleteResult)
  bulkDeleteQuestions(
    @Body() dto: BulkIdsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BulkDeleteResult> {
    return this.questionsService.bulkRemove(dto.ids, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm câu hỏi (chỉ người tạo)' })
  @ApiNullEnvelope()
  @ApiErrors(
    ErrorCode.FORBIDDEN,
    NOT_OWNER,
    ErrorCode.QUESTION_NOT_FOUND,
    ErrorCode.QUESTION_IN_PUBLISHED_EXAM,
  )
  deleteQuestion(
    @Param('id', UuidParam(ErrorCode.QUESTION_NOT_FOUND)) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.questionsService.remove(id, user);
  }
}
