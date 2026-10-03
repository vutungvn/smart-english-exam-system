import { ApiProperty } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';
import { Level, UserStatus } from '../../generated/prisma/enums.js';

// Khai báo trước MeProfile vì MeProfile tham chiếu tới class này trong decorator
export class StudentProfile {
  @ApiProperty({ enum: Level, enumName: 'Level', nullable: true })
  currentLevel: Level | null;

  @ApiProperty({ type: 'integer', nullable: true, example: 550 })
  currentScore: number | null;

  @ApiProperty({ type: 'integer', nullable: true, example: 750 })
  targetScore: number | null;
}

// Hồ sơ trả về cho GET /me; không bao giờ chứa passwordHash
export class MeProfile {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'hocvien@gmail.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: RoleCode, enumName: 'RoleCode' })
  role: RoleCode;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status: UserStatus;

  @ApiProperty()
  mustChangePassword: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  emailVerifiedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: StudentProfile, nullable: true, description: 'null với giáo viên và admin' })
  student: StudentProfile | null;
}

// Một lượt đăng nhập trong GET /me/login-history
export class LoginHistoryItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  success: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'INVALID_PASSWORD',
    description:
      'Mã lý do khi thất bại, ví dụ INVALID_PASSWORD, TOO_MANY_ATTEMPTS; null khi thành công',
  })
  failureReason: string | null;

  @ApiProperty({ type: String, nullable: true, example: '127.0.0.1' })
  ipAddress: string | null;

  @ApiProperty({ type: String, nullable: true })
  userAgent: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
