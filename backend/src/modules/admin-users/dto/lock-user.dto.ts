import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

// POST /admin/users/{id}/lock: lý do chỉ ghi vào nhật ký kiểm toán
export class LockUserDto {
  @ApiPropertyOptional({ maxLength: 500, example: 'Chia sẻ tài khoản cho người khác' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  reason?: string;
}
