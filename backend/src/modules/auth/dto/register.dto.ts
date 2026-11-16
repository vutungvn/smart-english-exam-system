import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { Match } from '../../../common/validators/match.decorator.js';
import {
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_REGEX,
} from '../../../common/validators/password.js';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A', minLength: 2, maxLength: 100 })
  @Trim()
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  @Length(2, 100, { message: 'Họ tên dài từ 2 đến 100 ký tự' })
  fullName: string;

  @ApiProperty({ example: 'hocvien@gmail.com', maxLength: 255 })
  @Trim()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255, { message: 'Email tối đa 255 ký tự' })
  email: string;

  @ApiProperty({
    example: 'MatKhau123',
    minLength: 8,
    maxLength: 72,
    description: STRONG_PASSWORD_MESSAGE,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({ example: 'MatKhau123' })
  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi ký tự' })
  @Match('password', { message: 'Xác nhận mật khẩu không khớp' })
  confirmPassword: string;

  @ApiProperty({
    example: true,
    description: 'Đồng ý Điều khoản sử dụng và Chính sách xử lý dữ liệu cá nhân',
  })
  @Equals(true, {
    message: 'Bạn cần đồng ý Điều khoản sử dụng và Chính sách xử lý dữ liệu cá nhân',
  })
  acceptTerms: boolean;
}
