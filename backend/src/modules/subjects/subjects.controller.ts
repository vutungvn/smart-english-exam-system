import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/decorators/public.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiListEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import { TopicQueryDto } from './dto/topic-query.dto.js';
import { SubjectsService } from './subjects.service.js';
import { SubjectItem, TopicItem } from './subjects.types.js';

// Công khai theo thiết kế API: trang chủ, bộ lọc đề thi cũng cần danh sách chương trình thi
@ApiTags('Subjects')
@IsPublic()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chương trình thi đang dùng' })
  @ApiListEnvelope(SubjectItem)
  listSubjects(): Promise<SubjectItem[]> {
    return this.subjectsService.listSubjects();
  }

  @Get(':id/topics')
  @ApiOperation({
    summary: 'Chủ đề của một chương trình thi',
    description: 'Lọc theo skill và part để lấy đúng chủ đề gắn được cho câu hỏi đang soạn.',
  })
  @ApiListEnvelope(TopicItem)
  @ApiErrors(ErrorCode.SUBJECT_NOT_FOUND)
  listTopics(
    @Param('id', UuidParam(ErrorCode.SUBJECT_NOT_FOUND)) id: string,
    @Query() query: TopicQueryDto,
  ): Promise<TopicItem[]> {
    return this.subjectsService.listTopics(id, query);
  }
}
