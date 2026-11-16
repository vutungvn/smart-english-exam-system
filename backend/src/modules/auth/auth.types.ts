import { ApiProperty } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { UserStatus } from '../../generated/prisma/enums.js';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

// Khai báo trước AuthSession: decorator của AuthSession tham chiếu tới class này ngay khi nạp file
export class AuthSessionUser {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'hocvien@gmail.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Ảnh đại diện; tài khoản Google lấy ảnh từ Google, null thì FE hiện chữ cái đầu',
  })
  avatarUrl: string | null;

  @ApiProperty({ enum: RoleCode, enumName: 'RoleCode' })
  role: RoleCode;

  @ApiProperty({
    description: 'true: FE chuyển thẳng tới trang Đổi mật khẩu (admin mặc định từ seed)',
  })
  mustChangePassword: boolean;
}

/** Body trả về cho login và refresh */
export class AuthSession {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({
    type: 'integer',
    example: 900,
    description: 'Số giây access token còn hiệu lực, FE dùng để biết khi nào cần làm mới',
  })
  expiresIn: number;

  @ApiProperty({ type: AuthSessionUser })
  user: AuthSessionUser;
}

/** Kết quả nội bộ của AuthService: refresh token đi riêng, controller đặt vào cookie httpOnly */
export interface IssuedSession extends AuthSession {
  refreshToken: string;
}

export class RegisterResult {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'hocvien@gmail.com' })
  email: string;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status: UserStatus;
}
