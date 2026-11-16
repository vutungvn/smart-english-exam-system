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
import { AutoFillApplyDto, AutoFillPreviewDto } from './auto-fill/auto-fill.dto.js';
import { ExamAutoFillService } from './auto-fill/auto-fill.service.js';
import { AutoFillCoverage, AutoFillPreview } from './auto-fill/auto-fill.types.js';
import { AddExamQuestionsDto, AddExamSectionDto } from './dto/exam-content.dto.js';
import { CreateExamDto, ExamQueryDto, UpdateExamDto } from './dto/exam.dto.js';
import { ExamContentService } from './exam-content.service.js';
import { ExamsService } from './exams.service.js';
import { ExamDetail, ExamPaper, ExamSummary, ExamValidation } from './exams.types.js';

// Ví dụ lỗi nghiệp vụ trả dạng VALIDATION_ERROR gắn trường, giống ngân hàng câu hỏi
const SECTION_RULE_ERROR: ApiErrorExample = {
  code: ErrorCode.VALIDATION_ERROR,
  details: [{ field: 'skill', message: 'Đề TOEIC LR chỉ gồm các Part Listening và Reading' }],
};
const QUESTION_RULE_ERROR: ApiErrorExample = {
  code: ErrorCode.VALIDATION_ERROR,
  details: [
    {
      field: 'questionIds',
      message: 'Reading Part 6 (Text Completion) gồm các nhóm câu, hãy thêm theo nhóm',
    },
  ],
};
const DUPLICATE: ApiErrorExample = {
  code: ErrorCode.EXAM_QUESTION_DUPLICATE,
  message: '2 câu đã có trong đề, không thêm lại',
  details: { questionIds: ['7b0c5d0e-1111-4c4b-9a5e-2f6a1c0d9e01'] },
};
const NOT_PUBLISHABLE: ApiErrorExample = {
  code: ErrorCode.EXAM_NOT_PUBLISHABLE,
  details: [
    {
      level: 'ERROR',
      code: 'WRONG_QUESTION_COUNT',
      message: 'Listening Part 2 (Question-Response) cần 25 câu, đang có 20',
      sectionId: '3f1e2d4c-2222-4a8b-8c1d-5e6f7a8b9c0d',
      questionId: null,
    },
  ],
};

const examId = () => UuidParam(ErrorCode.EXAM_NOT_FOUND);
const sectionId = () => UuidParam(ErrorCode.EXAM_SECTION_NOT_FOUND);

@ApiTags('Exams')
@ApiBearerAuth()
@Roles(RoleCode.TEACHER)
@Controller('teacher/exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly contentService: ExamContentService,
    private readonly autoFillService: ExamAutoFillService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đề thi của tôi' })
  @ApiPaginatedEnvelope(ExamSummary)
  listExams(
    @Query() query: ExamQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<WithMeta<ExamSummary[]>> {
    return this.examsService.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đề kèm phần thi và câu hỏi (màn soạn đề)' })
  @ApiEnvelope(ExamDetail)
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND)
  getExam(@Param('id', examId()) id: string, @CurrentUser() user: AuthUser): Promise<ExamDetail> {
    return this.examsService.get(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo đề thi (trạng thái Bản nháp)' })
  @ApiEnvelope(ExamDetail, { status: HttpStatus.CREATED })
  @ApiErrors({
    code: ErrorCode.VALIDATION_ERROR,
    details: [{ field: 'subjectId', message: 'Chương trình thi không tồn tại' }],
  })
  createExam(@Body() dto: CreateExamDto, @CurrentUser() user: AuthUser): Promise<ExamDetail> {
    return this.examsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa thông tin, cấu hình đề (gửi kèm updatedAt)' })
  @ApiEnvelope(ExamDetail)
  @ApiErrors(
    {
      code: ErrorCode.VALIDATION_ERROR,
      details: [{ field: 'scoringScale', message: 'Xóa hết phần thi trước khi đổi thang điểm' }],
    },
    ErrorCode.EXAM_NOT_FOUND,
    ErrorCode.VERSION_CONFLICT,
  )
  updateExam(
    @Param('id', examId()) id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamDetail> {
    return this.examsService.update(id, dto, user);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa nhiều đề (tối đa 100)',
    description:
      'Đề hợp lệ bị xóa mềm; đề không tồn tại/của người khác (NOT_FOUND), đang xuất bản (PUBLISHED) bị bỏ qua.',
  })
  @ApiEnvelope(BulkDeleteResult)
  bulkDeleteExams(
    @Body() dto: BulkIdsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BulkDeleteResult> {
    return this.examsService.bulkRemove(dto.ids, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm đề (đề đang xuất bản phải gỡ trước)' })
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND, ErrorCode.EXAM_PUBLISHED)
  deleteExam(@Param('id', examId()) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.examsService.remove(id, user);
  }

  @Post(':id/sections')
  @ApiOperation({
    summary: 'Thêm phần thi (một Part)',
    description: 'Thứ tự phần thi tự sắp theo Part chuẩn TOEIC: L1…L4, R5…R7, S1…S5, W1…W3.',
  })
  @ApiEnvelope(ExamDetail, { status: HttpStatus.CREATED })
  @ApiErrors(
    SECTION_RULE_ERROR,
    ErrorCode.EXAM_NOT_FOUND,
    ErrorCode.EXAM_PUBLISHED,
    ErrorCode.EXAM_SECTION_EXISTS,
  )
  addSection(
    @Param('id', examId()) id: string,
    @Body() dto: AddExamSectionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamDetail> {
    return this.contentService.addSection(id, dto, user);
  }

  @Delete(':id/sections/:sectionId')
  @ApiOperation({ summary: 'Xóa phần thi kèm các câu trong phần' })
  @ApiEnvelope(ExamDetail)
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND, ErrorCode.EXAM_SECTION_NOT_FOUND, ErrorCode.EXAM_PUBLISHED)
  removeSection(
    @Param('id', examId()) id: string,
    @Param('sectionId', sectionId()) section: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamDetail> {
    return this.contentService.removeSection(id, section, user);
  }

  @Post(':id/sections/:sectionId/questions')
  @ApiOperation({
    summary: 'Thêm câu đơn hoặc nhóm câu vào phần thi',
    description:
      'Part câu đơn gửi questionIds; Part nhóm (L3, L4, R6, R7, S4) gửi groupIds, cả nhóm được thêm như một khối. Không trùng câu trong cả đề.',
  })
  @ApiEnvelope(ExamDetail, { status: HttpStatus.CREATED })
  @ApiErrors(
    QUESTION_RULE_ERROR,
    ErrorCode.EXAM_NOT_FOUND,
    ErrorCode.EXAM_SECTION_NOT_FOUND,
    ErrorCode.EXAM_PUBLISHED,
    DUPLICATE,
  )
  addQuestions(
    @Param('id', examId()) id: string,
    @Param('sectionId', sectionId()) section: string,
    @Body() dto: AddExamQuestionsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamDetail> {
    return this.contentService.addQuestions(id, section, dto, user);
  }

  @Delete(':id/sections/:sectionId/questions/:examQuestionId')
  @ApiOperation({ summary: 'Gỡ câu khỏi phần thi (câu thuộc nhóm thì gỡ cả nhóm)' })
  @ApiEnvelope(ExamDetail)
  @ApiErrors(
    ErrorCode.EXAM_NOT_FOUND,
    ErrorCode.EXAM_SECTION_NOT_FOUND,
    ErrorCode.EXAM_QUESTION_NOT_FOUND,
    ErrorCode.EXAM_PUBLISHED,
  )
  removeQuestion(
    @Param('id', examId()) id: string,
    @Param('sectionId', sectionId()) section: string,
    @Param('examQuestionId', UuidParam(ErrorCode.EXAM_QUESTION_NOT_FOUND)) examQuestionId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamDetail> {
    return this.contentService.removeQuestion(id, section, examQuestionId, user);
  }

  @Get(':id/auto-fill/coverage')
  @ApiOperation({
    summary: 'Rút đề tự động: ngân hàng hiện có cho từng Part của đề',
    description:
      'Số câu hoặc nhóm rút được (ACTIVE, đúng định dạng), chia theo độ khó, chủ đề, kích thước nhóm; ' +
      'số chưa dùng ở đề khác; số câu đề này đang có ở mỗi Part.',
  })
  @ApiEnvelope(AutoFillCoverage)
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND)
  getAutoFillCoverage(
    @Param('id', examId()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AutoFillCoverage> {
    return this.autoFillService.coverage(id, user);
  }

  @Post(':id/auto-fill/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rút đề tự động: xem trước (không ghi gì)',
    description:
      'Chọn câu theo ma trận số lượng × độ khó × chủ đề; nhóm câu chọn nguyên khối; Reading Part 7 ' +
      'đề TOEIC đúng 54 câu theo cấu trúc ETS. Ngân hàng không đủ thì nới ràng buộc theo thứ tự chủ ' +
      'đề → độ khó → câu đã dùng và ghi lại trong relaxed. Gửi lại cùng seed để ra cùng kết quả.',
  })
  @ApiEnvelope(AutoFillPreview)
  @ApiErrors(
    {
      code: ErrorCode.VALIDATION_ERROR,
      details: [{ field: 'parts[0].difficulty', message: 'Tổng tỉ lệ độ khó phải bằng 100%' }],
    },
    ErrorCode.EXAM_NOT_FOUND,
    ErrorCode.EXAM_PUBLISHED,
  )
  previewAutoFill(
    @Param('id', examId()) id: string,
    @Body() dto: AutoFillPreviewDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AutoFillPreview> {
    return this.autoFillService.preview(id, dto, user);
  }

  @Post(':id/auto-fill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rút đề tự động: áp dụng kết quả xem trước',
    description:
      'Gửi đúng các câu, nhóm của bản xem trước kèm updatedAt của đề. Kiểm tra lại từng câu như khi ' +
      'thêm tay rồi ghi cả đề trong một transaction. scope ALL xóa toàn bộ câu cũ trước khi ghi.',
  })
  @ApiEnvelope(ExamDetail)
  @ApiErrors(
    {
      code: ErrorCode.VALIDATION_ERROR,
      details: [{ field: 'questionIds', message: 'Câu "…" đã ngừng dùng' }],
    },
    ErrorCode.EXAM_NOT_FOUND,
    ErrorCode.EXAM_PUBLISHED,
    ErrorCode.EXAM_QUESTION_DUPLICATE,
    ErrorCode.VERSION_CONFLICT,
  )
  applyAutoFill(
    @Param('id', examId()) id: string,
    @Body() dto: AutoFillApplyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamDetail> {
    return this.autoFillService.apply(id, dto, user);
  }

  @Get(':id/validation')
  @ApiOperation({
    summary: 'Kiểm tra điều kiện xuất bản',
    description: 'ERROR chặn xuất bản; WARNING chỉ nhắc (ví dụ chưa có tệp âm thanh).',
  })
  @ApiEnvelope(ExamValidation)
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND)
  validateExam(
    @Param('id', examId()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamValidation> {
    return this.examsService.validate(id, user);
  }

  @Get(':id/preview')
  @ApiOperation({
    summary: 'Xem trước đề như học viên nhận (không đáp án, không lời thoại)',
  })
  @ApiEnvelope(ExamPaper)
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND)
  previewExam(
    @Param('id', examId()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamPaper> {
    return this.examsService.preview(id, user);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xuất bản đề (kiểm tra điều kiện trước)' })
  @ApiEnvelope(ExamDetail)
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND, NOT_PUBLISHABLE)
  publishExam(
    @Param('id', examId()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamDetail> {
    return this.examsService.publish(id, user);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gỡ xuất bản: ẩn khỏi học viên, giữ nguyên bài làm đã có' })
  @ApiEnvelope(ExamDetail)
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND)
  unpublishExam(
    @Param('id', examId()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamDetail> {
    return this.examsService.unpublish(id, user);
  }
}
