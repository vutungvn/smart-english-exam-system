import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Skill } from '../../../generated/prisma/enums.js';

// GET /subjects/:id/topics?skill=LISTENING&part=3 → chủ đề dùng được cho câu Listening Part 3
export class TopicQueryDto {
  @ApiPropertyOptional({ enum: Skill, enumName: 'Skill' })
  @IsOptional()
  @IsEnum(Skill, { message: 'skill không hợp lệ' })
  skill?: Skill;

  @ApiPropertyOptional({ minimum: 1, maximum: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'part phải là số nguyên' })
  @Min(1, { message: 'part từ 1 đến 7' })
  @Max(7, { message: 'part từ 1 đến 7' })
  part?: number;
}
