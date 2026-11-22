import { ApiProperty } from '@nestjs/swagger';
import { RoleCode } from '../../common/constants/roles.js';

const ROLE_CODES = Object.values(RoleCode);
const JSON_OBJECT = { type: 'object', additionalProperties: true, nullable: true } as const;

// Khai báo trước AuditLogListItem vì class đó tham chiếu tới class này trong decorator
export class AuditLogActor {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Quản trị viên' })
  fullName: string;

  @ApiProperty({ example: 'admin@smartexam.vn' })
  email: string;

  @ApiProperty({ enum: ROLE_CODES, enumName: 'RoleCode' })
  role: RoleCode;
}

// Một dòng trong GET /admin/audit-logs (không có before/after cho nhẹ)
export class AuditLogListItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ example: 'user.lock' })
  action: string;

  @ApiProperty({ example: 'user' })
  entity: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  entityId: string | null;

  @ApiProperty({ type: String, nullable: true, example: '127.0.0.1' })
  ipAddress: string | null;

  @ApiProperty({
    type: AuditLogActor,
    nullable: true,
    description: 'null khi tài khoản thực hiện đã bị xóa',
  })
  actor: AuditLogActor | null;
}

// GET /admin/audit-logs/{id}
export class AuditLogDetail extends AuditLogListItem {
  @ApiProperty({ ...JSON_OBJECT, description: 'Dữ liệu trước khi thay đổi' })
  before: unknown;

  @ApiProperty({ ...JSON_OBJECT, description: 'Dữ liệu sau khi thay đổi' })
  after: unknown;

  @ApiProperty({ ...JSON_OBJECT, description: 'Thông tin thêm, ví dụ lý do khóa tài khoản' })
  meta: unknown;

  @ApiProperty({ type: String, nullable: true })
  userAgent: string | null;
}

export class AuditFilterOption {
  @ApiProperty({ example: 'user.lock' })
  value: string;

  @ApiProperty({ example: 'Khóa tài khoản' })
  label: string;
}

// GET /admin/audit-logs/filters
export class AuditLogFilterOptions {
  @ApiProperty({ type: [AuditFilterOption], description: 'Hành động đã có trong nhật ký' })
  actions: AuditFilterOption[];

  @ApiProperty({ type: [AuditFilterOption], description: 'Loại đối tượng đã có trong nhật ký' })
  entities: AuditFilterOption[];
}
