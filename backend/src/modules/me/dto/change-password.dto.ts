import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import { Match } from '../../../common/validators/match.decorator.js';
import {
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_REGEX,
} from '../../../common/validators/password.js';

export class ChangePasswordDto {
  // Không áp luật mật khẩu mạnh: mật khẩu cũ (ví dụ admin trong seed) có thể không đạt luật hiện tại
  @ApiProperty({ example: 'MatKhau123' })
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự' })
  @Length(1, 72, { message: 'Vui lòng nhập mật khẩu hiện tại' })
  currentPassword: string;

  @ApiProperty({
    example: 'MatKhauMoi123',
    minLength: 8,
    maxLength: 72,
    description: STRONG_PASSWORD_MESSAGE,
  })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  newPassword: string;

  @ApiProperty({ example: 'MatKhauMoi123' })
  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi ký tự' })
  @Match('newPassword', { message: 'Xác nhận mật khẩu không khớp' })
  confirmPassword: string;
}
