import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { RoleCode } from '../../src/common/constants/roles.js';

const ROLES = [
  {
    code: RoleCode.STUDENT,
    name: 'Học viên',
    description: 'Luyện thi, làm bài, xem kết quả và gợi ý học tập',
  },
  {
    code: RoleCode.TEACHER,
    name: 'Giáo viên',
    description: 'Quản lý khóa học, ngân hàng câu hỏi và đề thi',
  },
  {
    code: RoleCode.ADMIN,
    name: 'Quản trị viên',
    description: 'Quản trị người dùng, phân quyền và cấu hình hệ thống',
  },
];

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }
  console.log(`• Vai trò: ${ROLES.map((role) => role.code).join(', ')}`);
}
