import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { QuestionStatus } from '../../../generated/prisma/enums.js';

const IMPORT_STATUSES = [QuestionStatus.DRAFT, QuestionStatus.ACTIVE] as const;

export class ConfirmImportDto {
  @ApiPropertyOptional({
    enum: IMPORT_STATUSES,
    enumName: 'ImportStatus',
    default: QuestionStatus.DRAFT,
    description: 'Trạng thái của mọi nhóm, câu được nhập. ACTIVE: dùng ngay để soạn đề xuất bản',
  })
  @IsOptional()
  @IsIn(IMPORT_STATUSES, { message: 'status chỉ nhận DRAFT hoặc ACTIVE' })
  status?: (typeof IMPORT_STATUSES)[number];
}
