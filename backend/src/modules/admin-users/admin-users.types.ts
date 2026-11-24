import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../generated/prisma/enums.js';
import { StudentProfile } from '../me/me.types.js';
import { MANAGED_ROLES, type ManagedRole } from './admin-users.rules.js';

// Khai báo trước AdminUserDetail vì AdminUserDetail tham chiếu tới class này trong decorator
export class AdminTeacherProfile {
  @ApiProperty({ example: 'Trường THPT A' })
  organization: string;

  @ApiProperty({ example: 'TOEIC Listening' })
  specialization: string;

  @ApiProperty({ description: 'Đã được admin duyệt hồ sơ giáo viên' })
  isApproved: boolean;
}

// Một dòng trong GET /admin/users
export class AdminUserListItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'hocvien@gmail.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: MANAGED_ROLES, enumName: 'ManagedRole' })
  role: ManagedRole;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status: UserStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  emailVerifiedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

// GET /admin/users/{id}; không bao giờ chứa passwordHash
export class AdminUserDetail extends AdminUserListItem {
  @ApiProperty({ description: 'false: tài khoản chỉ đăng nhập bằng Google' })
  hasPassword: boolean;

  @ApiProperty({ description: 'true: đã liên kết đăng nhập bằng Google' })
  googleLinked: boolean;

  @ApiProperty()
  mustChangePassword: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  termsAcceptedAt: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Gửi lại trong PATCH để kiểm tra xung đột',
  })
  updatedAt: Date;

  @ApiProperty({
    type: StudentProfile,
    nullable: true,
    description: 'null nếu không phải học viên',
  })
  student: StudentProfile | null;

  @ApiProperty({
    type: AdminTeacherProfile,
    nullable: true,
    description: 'null nếu không phải giáo viên',
  })
  teacher: AdminTeacherProfile | null;
}
