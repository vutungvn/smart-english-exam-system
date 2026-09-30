import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token trong liên kết xác minh (phần sau "token=")',
    example: 'q3Zb1k0yXo9mQ2...43 ký tự',
  })
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Liên kết không hợp lệ' })
  token: string;
}
