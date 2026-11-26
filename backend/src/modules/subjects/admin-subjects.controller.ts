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
import { Audit } from '../../common/decorators/audit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import {
  ApiEnvelope,
  ApiListEnvelope,
  ApiNullEnvelope,
} from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import { AdminSubjectsService } from './admin-subjects.service.js';
import { AdminSubjectItem, AdminTopicItem } from './admin-subjects.types.js';
import {
  CreateSubjectDto,
  CreateTopicDto,
  UpdateSubjectDto,
  UpdateTopicDto,
} from './dto/admin-subject.dto.js';
import { TopicQueryDto } from './dto/topic-query.dto.js';

const SubjectId = UuidParam(ErrorCode.SUBJECT_NOT_FOUND);
const TopicId = UuidParam(ErrorCode.TOPIC_NOT_FOUND);
const INVALID_PARTS = {
  code: ErrorCode.VALIDATION_ERROR,
  details: [{ field: 'parts', message: 'Part 1 không thuộc READING; dùng được: 5, 6, 7' }],
};

@ApiTags('Admin Subjects')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('admin/subjects')
export class AdminSubjectsController {
  constructor(private readonly subjects: AdminSubjectsService) {}

  // -------------------------------------------------------------------------------------------
  // Chương trình thi

  @Get()
  @ApiOperation({
    summary: 'Danh sách chương trình thi (cả đang ẩn) kèm số chủ đề, đề thi, câu hỏi',
  })
  @ApiListEnvelope(AdminSubjectItem)
  listAdminSubjects(): Promise<AdminSubjectItem[]> {
    return this.subjects.listSubjects();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một chương trình thi' })
  @ApiEnvelope(AdminSubjectItem)
  @ApiErrors(ErrorCode.SUBJECT_NOT_FOUND)
  getAdminSubject(@Param('id', SubjectId) id: string): Promise<AdminSubjectItem> {
    return this.subjects.getSubject(id);
  }

  @Post()
  @Audit('subject.create')
  @ApiOperation({ summary: 'Thêm chương trình thi', description: 'Mã không đổi được sau khi tạo.' })
  @ApiEnvelope(AdminSubjectItem, { status: HttpStatus.CREATED })
  @ApiErrors(ErrorCode.SUBJECT_CODE_EXISTS)
  createSubject(@Body() dto: CreateSubjectDto): Promise<AdminSubjectItem> {
    return this.subjects.createSubject(dto);
  }

  @Patch(':id')
  @Audit('subject.update')
  @ApiOperation({
    summary: 'Sửa tên, ẩn/hiện chương trình thi',
    description:
      'Chương trình ẩn không còn trong danh sách công khai, không chọn được khi tạo đề, câu hỏi, ' +
      'nhập tệp; đề và câu hỏi đã có giữ nguyên. TOEIC không ẩn được.',
  })
  @ApiEnvelope(AdminSubjectItem)
  @ApiErrors(ErrorCode.SUBJECT_NOT_FOUND, ErrorCode.SUBJECT_PROTECTED, ErrorCode.VERSION_CONFLICT)
  updateSubject(
    @Param('id', SubjectId) id: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<AdminSubjectItem> {
    return this.subjects.updateSubject(id, dto);
  }

  @Delete(':id')
  @Audit('subject.delete')
  @ApiOperation({
    summary: 'Xóa chương trình thi',
    description:
      'Chỉ khi chưa có đề thi, câu hỏi, nhóm câu nào (tính cả bản đã xóa); chủ đề xóa theo. ' +
      'TOEIC không xóa được.',
  })
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.SUBJECT_NOT_FOUND, ErrorCode.SUBJECT_PROTECTED, ErrorCode.SUBJECT_IN_USE)
  deleteSubject(@Param('id', SubjectId) id: string): Promise<void> {
    return this.subjects.deleteSubject(id);
  }

  // -------------------------------------------------------------------------------------------
  // Chủ đề

  @Get(':id/topics')
  @ApiOperation({ summary: 'Chủ đề của chương trình kèm số câu hỏi, nhóm câu đang dùng' })
  @ApiListEnvelope(AdminTopicItem)
  @ApiErrors(ErrorCode.SUBJECT_NOT_FOUND)
  listAdminTopics(
    @Param('id', SubjectId) id: string,
    @Query() query: TopicQueryDto,
  ): Promise<AdminTopicItem[]> {
    return this.subjects.listTopics(id, query);
  }

  @Post(':id/topics')
  @Audit('topic.create')
  @ApiOperation({
    summary: 'Thêm chủ đề',
    description: 'Part phải thuộc kỹ năng. Chương trình IELTS chưa thêm chủ đề được.',
  })
  @ApiEnvelope(AdminTopicItem, { status: HttpStatus.CREATED })
  @ApiErrors(
    ErrorCode.SUBJECT_NOT_FOUND,
    ErrorCode.TOPIC_NAME_EXISTS,
    ErrorCode.TOPICS_NOT_SUPPORTED,
    INVALID_PARTS,
  )
  createTopic(
    @Param('id', SubjectId) id: string,
    @Body() dto: CreateTopicDto,
  ): Promise<AdminTopicItem> {
    return this.subjects.createTopic(id, dto);
  }

  @Patch(':id/topics/:topicId')
  @Audit('topic.update')
  @ApiOperation({
    summary: 'Sửa chủ đề',
    description:
      'Đổi tên làm tệp nhập câu hỏi soạn theo tên cũ báo lỗi. Không đổi kỹ năng khi chủ đề còn ' +
      'câu hỏi, không bỏ Part còn câu hỏi dùng.',
  })
  @ApiEnvelope(AdminTopicItem)
  @ApiErrors(
    ErrorCode.SUBJECT_NOT_FOUND,
    ErrorCode.TOPIC_NOT_FOUND,
    ErrorCode.TOPIC_NAME_EXISTS,
    ErrorCode.TOPIC_IN_USE,
    ErrorCode.VERSION_CONFLICT,
    INVALID_PARTS,
  )
  updateTopic(
    @Param('id', SubjectId) id: string,
    @Param('topicId', TopicId) topicId: string,
    @Body() dto: UpdateTopicDto,
  ): Promise<AdminTopicItem> {
    return this.subjects.updateTopic(id, topicId, dto);
  }

  @Delete(':id/topics/:topicId')
  @Audit('topic.delete')
  @ApiOperation({
    summary: 'Xóa chủ đề',
    description: 'Chỉ khi chưa có câu hỏi, nhóm câu nào dùng (tính cả bản đã xóa).',
  })
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.SUBJECT_NOT_FOUND, ErrorCode.TOPIC_NOT_FOUND, ErrorCode.TOPIC_IN_USE)
  deleteTopic(
    @Param('id', SubjectId) id: string,
    @Param('topicId', TopicId) topicId: string,
  ): Promise<void> {
    return this.subjects.deleteTopic(id, topicId);
  }
}
