import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

export class LoginDto {
  @ApiProperty({ example: 'admin@gmail.com', maxLength: 255 })
  @Trim()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255, { message: 'Email tối đa 255 ký tự' })
  email: string;

  @ApiProperty({ example: '12345678', maxLength: 72 })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  password: string;
}
