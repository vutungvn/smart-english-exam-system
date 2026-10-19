import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PROGRESS_RANGES, type ProgressRange } from '../progress-stats.js';

const RANGE_MESSAGE = `range thuộc: ${PROGRESS_RANGES.join(', ')}`;

export class ScoreTrendQueryDto {
  @ApiPropertyOptional({
    enum: PROGRESS_RANGES,
    default: '90d',
    description: '30d, 90d, 1y: 30 ngày, 90 ngày, 1 năm gần nhất · all: toàn bộ',
  })
  @IsOptional()
  @IsIn(PROGRESS_RANGES, { message: RANGE_MESSAGE })
  range: ProgressRange = '90d';
}

export class ProgressSkillsQueryDto {
  @ApiPropertyOptional({ enum: PROGRESS_RANGES, default: 'all' })
  @IsOptional()
  @IsIn(PROGRESS_RANGES, { message: RANGE_MESSAGE })
  range: ProgressRange = 'all';
}
