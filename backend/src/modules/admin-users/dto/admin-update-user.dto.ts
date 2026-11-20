import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsDivisibleBy,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

/**
 * PATCH /admin/users/{id}: trường nào không gửi thì giữ nguyên.
 * Không sửa được email, trạng thái (dùng lock/unlock), vai trò.
 */
export class AdminUpdateUserDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'updatedAt nhận được lần đọc gần nhất; đã có người sửa sau đó thì trả 409',
  })
  @IsDateString({}, { message: 'updatedAt phải là thời điểm ISO 8601' })
  updatedAt: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', minLength: 2, maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @Length(2, 100, { message: 'Họ tên dài từ 2 đến 100 ký tự' })
  fullName?: string;

  @ApiPropertyOptional({
    example: 750,
    minimum: 10,
    maximum: 990,
    description: 'Điểm TOEIC mục tiêu, bước 5 điểm (chỉ học viên)',
  })
  @IsOptional()
  @IsInt({ message: 'Điểm mục tiêu phải là số nguyên' })
  @Min(10, { message: 'Điểm mục tiêu tối thiểu là 10' })
  @Max(990, { message: 'Điểm mục tiêu tối đa là 990' })
  @IsDivisibleBy(5, { message: 'Điểm mục tiêu phải là bội số của 5' })
  targetScore?: number;

  @ApiPropertyOptional({ example: 'Trường THPT A', maxLength: 255, description: 'Chỉ giáo viên' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Đơn vị công tác phải là chuỗi ký tự' })
  @Length(2, 255, { message: 'Đơn vị công tác dài từ 2 đến 255 ký tự' })
  organization?: string;

  @ApiPropertyOptional({ example: 'TOEIC Listening', maxLength: 255, description: 'Chỉ giáo viên' })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Chuyên môn phải là chuỗi ký tự' })
  @Length(2, 255, { message: 'Chuyên môn dài từ 2 đến 255 ký tự' })
  specialization?: string;
}
