import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDivisibleBy, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

// Body của PATCH /me: trường nào không gửi thì giữ nguyên
export class UpdateProfileDto {
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
    description: 'Điểm TOEIC Listening + Reading mục tiêu, bước 5 điểm (chỉ học viên)',
  })
  @IsOptional()
  @IsInt({ message: 'Điểm mục tiêu phải là số nguyên' })
  @Min(10, { message: 'Điểm mục tiêu tối thiểu là 10' })
  @Max(990, { message: 'Điểm mục tiêu tối đa là 990' })
  @IsDivisibleBy(5, { message: 'Điểm mục tiêu phải là bội số của 5' })
  targetScore?: number;
}
