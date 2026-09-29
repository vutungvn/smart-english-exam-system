import { UserStatus } from '../../src/generated/prisma/client.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { RoleCode } from '../../src/common/constants/roles.js';
import { hashPassword } from '../../src/module/auth/password.js';

// Tài khoản cho môi trường dev. Mật khẩu ai cũng biết nên bắt buộc đổi ở lần đăng nhập đầu (D8)
const DEFAULT_ADMIN = {
  email: 'admin@gmail.com',
  password: '12345678',
  fullName: 'Quản trị viên',
  phone: '0123456789',
};

export async function seedAdmin(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN.email },
    select: { id: true },
  });
  if (existing) {
    console.log(`• Admin ${DEFAULT_ADMIN.email} đã tồn tại, bỏ qua`);
    return;
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.ADMIN } });

  await prisma.user.create({
    data: {
      roleId: adminRole.id,
      email: DEFAULT_ADMIN.email,
      passwordHash: await hashPassword(DEFAULT_ADMIN.password),
      fullName: DEFAULT_ADMIN.fullName,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
      admin: { create: { phone: DEFAULT_ADMIN.phone } },
    },
  });
  console.log(`• Đã tạo admin ${DEFAULT_ADMIN.email} (phải đổi mật khẩu khi đăng nhập lần đầu)`);
}
