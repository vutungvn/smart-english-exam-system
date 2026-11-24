import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import { ApiEnvelope, ApiPaginatedEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { WithMeta } from '../../common/types/api-response.js';
import { AdminAuditLogsService } from './admin-audit-logs.service.js';
import {
  AuditLogDetail,
  AuditLogFilterOptions,
  AuditLogListItem,
} from './admin-audit-logs.types.js';
import { AUDIT_EXPORT_CONTENT_TYPES, AUDIT_EXPORT_MAX_ROWS } from './audit-log-export.js';
import { AuditLogQueryDto, ExportAuditLogsDto } from './dto/audit-log-filter.dto.js';

const BINARY = { schema: { type: 'string', format: 'binary' } } as const;
const FROM_AFTER_TO = {
  code: ErrorCode.BAD_REQUEST,
  message: 'Thời điểm bắt đầu phải trước thời điểm kết thúc',
} as const;

/** Nhật ký kiểm toán chỉ được đọc: không có route sửa/xóa (UC tra cứu nhật ký, luồng phụ 3) */
@ApiTags('Admin Audit Logs')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AdminAuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Tra cứu nhật ký kiểm toán (lọc, phân trang)',
    description:
      'Mặc định mới nhất trước. Lịch sử thao tác trên một tài khoản: entity=user&entityId=<id>.',
  })
  @ApiPaginatedEnvelope(AuditLogListItem)
  @ApiErrors(FROM_AFTER_TO)
  listAuditLogs(@Query() query: AuditLogQueryDto): Promise<WithMeta<AuditLogListItem[]>> {
    return this.auditLogsService.findAll(query);
  }

  // Khai báo trước :id để "filters" không bị hiểu là id
  @Get('filters')
  @ApiOperation({ summary: 'Hành động, loại đối tượng đã có trong nhật ký (cho bộ lọc)' })
  @ApiEnvelope(AuditLogFilterOptions)
  getAuditLogFilters(): Promise<AuditLogFilterOptions> {
    return this.auditLogsService.filterOptions();
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @Audit('audit_log.export')
  @ApiOperation({
    summary: 'Xuất kết quả tra cứu ra CSV hoặc Excel',
    description: `Cùng điều kiện lọc với danh sách, tối đa ${AUDIT_EXPORT_MAX_ROWS} dòng, mới nhất trước.`,
  })
  @ApiProduces(AUDIT_EXPORT_CONTENT_TYPES.csv, AUDIT_EXPORT_CONTENT_TYPES.xlsx)
  @ApiOkResponse({
    description: 'Tệp .csv hoặc .xlsx',
    content: {
      [AUDIT_EXPORT_CONTENT_TYPES.csv]: BINARY,
      [AUDIT_EXPORT_CONTENT_TYPES.xlsx]: BINARY,
    },
  })
  @ApiErrors(FROM_AFTER_TO, ErrorCode.AUDIT_EXPORT_TOO_LARGE)
  async exportAuditLogs(@Body() dto: ExportAuditLogsDto): Promise<StreamableFile> {
    const file = await this.auditLogsService.export(dto);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một bản ghi: dữ liệu trước và sau khi thay đổi' })
  @ApiEnvelope(AuditLogDetail)
  @ApiErrors(ErrorCode.AUDIT_LOG_NOT_FOUND)
  getAuditLog(
    @Param('id', UuidParam(ErrorCode.AUDIT_LOG_NOT_FOUND)) id: string,
  ): Promise<AuditLogDetail> {
    return this.auditLogsService.findOne(id);
  }
}
