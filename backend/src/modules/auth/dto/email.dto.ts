import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

// Dùng cho các API chỉ nhận email: gửi lại xác minh, sau này là quên mật khẩu
export class EmailDto {
  @ApiProperty({ example: 'hocvien@gmail.com', maxLength: 255 })
  @Trim()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255, { message: 'Email tối đa 255 ký tự' })
  email: string;
}
