import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { ApiEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import {
  DashboardOverview,
  DashboardRefreshResult,
  DashboardTrends,
} from './admin-dashboard.types.js';
import { DASHBOARD_CACHE_TTL_SECONDS, MAX_RANGE_DAYS } from './dashboard-range.js';
import { DashboardRangeDto, DashboardTrendsQueryDto } from './dto/dashboard-query.dto.js';

const INVALID_RANGE = {
  code: ErrorCode.BAD_REQUEST,
  message: 'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc',
} as const;
const CACHE_NOTE = `Số liệu lưu tạm ${DASHBOARD_CACHE_TTL_SECONDS / 60} phút; xem generatedAt.`;

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Chỉ số tổng quan: người dùng, đề thi, lượt làm bài, lượt gọi AI, truy cập',
    description: `Số "tổng" là hiện trạng; số "trong kỳ" theo from/to (giờ Việt Nam, tối đa ${MAX_RANGE_DAYS} ngày). ${CACHE_NOTE}`,
  })
  @ApiEnvelope(DashboardOverview)
  @ApiErrors(INVALID_RANGE)
  getOverview(@Query() query: DashboardRangeDto): Promise<DashboardOverview> {
    return this.dashboardService.overview(query);
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Dữ liệu biểu đồ xu hướng theo ngày hoặc tuần',
    description: `Đủ mọi mốc trong kỳ, mốc không có dữ liệu là 0. ${CACHE_NOTE}`,
  })
  @ApiEnvelope(DashboardTrends)
  @ApiErrors(INVALID_RANGE)
  getTrends(@Query() query: DashboardTrendsQueryDto): Promise<DashboardTrends> {
    return this.dashboardService.trends(query);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa số liệu đang lưu tạm để lần xem kế tiếp tính lại từ DB' })
  @ApiEnvelope(DashboardRefreshResult)
  refreshDashboard(): Promise<DashboardRefreshResult> {
    return this.dashboardService.refresh();
  }
}
