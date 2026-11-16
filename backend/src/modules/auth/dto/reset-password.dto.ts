import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { Match } from '../../../common/validators/match.decorator.js';
import {
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_REGEX,
} from '../../../common/validators/password.js';

// Query của GET /auth/reset-password/validate
export class ResetPasswordTokenDto {
  @ApiProperty({ description: 'Token trong liên kết đặt lại mật khẩu (phần sau "token=")' })
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Liên kết không hợp lệ' })
  token: string;
}

// Body của POST /auth/reset-password: kế thừa trường token và luật kiểm tra của nó
export class ResetPasswordDto extends ResetPasswordTokenDto {
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
