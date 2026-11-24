import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, Matches } from 'class-validator';
import { DASHBOARD_GRANULARITIES, MAX_RANGE_DAYS } from '../dashboard-range.js';
import type { DashboardGranularity } from '../dashboard-range.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// GET /admin/dashboard/overview
export class DashboardRangeDto {
  @ApiPropertyOptional({
    format: 'date',
    description: `Từ ngày (giờ Việt Nam, tính cả ngày này). Mặc định 29 ngày trước "to". Kỳ tối đa ${MAX_RANGE_DAYS} ngày`,
    example: '2026-11-01',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'from có dạng yyyy-MM-dd' })
  // strict: chặn ngày không có thật như 2026-02-30
  @IsISO8601({ strict: true }, { message: 'from không phải ngày hợp lệ' })
  from?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Đến ngày (giờ Việt Nam, tính cả ngày này). Mặc định hôm nay',
    example: '2026-11-30',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'to có dạng yyyy-MM-dd' })
  @IsISO8601({ strict: true }, { message: 'to không phải ngày hợp lệ' })
  to?: string;
}

// GET /admin/dashboard/trends
export class DashboardTrendsQueryDto extends DashboardRangeDto {
  @ApiPropertyOptional({
    enum: DASHBOARD_GRANULARITIES,
    default: 'day',
    description: 'Gom số liệu theo ngày hoặc theo tuần (tuần bắt đầu thứ Hai)',
  })
  @IsOptional()
  @IsIn(DASHBOARD_GRANULARITIES, {
    message: `granularity thuộc: ${DASHBOARD_GRANULARITIES.join(', ')}`,
  })
  granularity: DashboardGranularity = 'day';
}
