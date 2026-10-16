import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiEnvelope, ApiPaginatedEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { WithMeta } from '../../common/types/api-response.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { ExamCatalogDetail, ExamCatalogItem } from './attempts.types.js';
import { ExamCatalogQueryDto } from './dto/attempt.dto.js';
import { ExamCatalogService } from './exam-catalog.service.js';

// Đề đã xuất bản cho học viên. Cần đăng nhập (D25, tài liệu API ghi Public) để kèm số lượt đã làm
@ApiTags('Exam Catalog')
@ApiBearerAuth()
@Controller('exams')
export class ExamCatalogController {
  constructor(private readonly catalog: ExamCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách đề đã xuất bản (trang "Luyện đề thi")',
    description:
      'Mới xuất bản trước. Kèm số lượt đã làm, số lượt còn lại và bài đang làm dở của người xem.',
  })
  @ApiPaginatedEnvelope(ExamCatalogItem)
  listPublishedExams(
    @Query() query: ExamCatalogQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<WithMeta<ExamCatalogItem[]>> {
    return this.catalog.list(query, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết đề đã xuất bản: các Part, số câu, thời gian, lượt làm của tôi',
  })
  @ApiEnvelope(ExamCatalogDetail)
  @ApiErrors(ErrorCode.EXAM_NOT_FOUND)
  getPublishedExam(
    @Param('id', UuidParam(ErrorCode.EXAM_NOT_FOUND)) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ExamCatalogDetail> {
    return this.catalog.get(id, user);
  }
}
