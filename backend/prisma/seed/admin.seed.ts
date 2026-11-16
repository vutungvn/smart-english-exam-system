import { UserStatus } from '../../src/generated/prisma/client.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { RoleCode } from '../../src/common/constants/roles.js';
import { hashPassword } from '../../src/modules/auth/password.js';

// Tài khoản cho môi trường dev. Mật khẩu ai cũng biết nên bắt buộc đổi ở lần đăng nhập đầu (D8).
// Production lấy email, mật khẩu từ SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (bắt buộc)
const DEFAULT_ADMIN = {
  email: 'admin@gmail.com',
  password: '12345678',
  fullName: 'Quản trị viên',
  phone: '0123456789',
};

const PROD_PASSWORD_MIN = 12;

/** Email, mật khẩu admin: production phải khai qua biến môi trường, không dùng mật khẩu mặc định */
function adminCredentials(): { email: string; password: string } {
  if (process.env.NODE_ENV !== 'production') return DEFAULT_ADMIN;
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  if (password.length < PROD_PASSWORD_MIN) {
    throw new Error(
      `Production cần SEED_ADMIN_PASSWORD dài ít nhất ${PROD_PASSWORD_MIN} ký tự (infra/.env.prod)`,
    );
  }
  const email = (process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN.email).trim().toLowerCase();
  return { email, password };
}

export async function seedAdmin(prisma: PrismaClient): Promise<void> {
  const { email, password } = adminCredentials();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    console.log(`• Admin ${email} đã tồn tại, bỏ qua`);
    return;
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.ADMIN } });

  await prisma.user.create({
    data: {
      roleId: adminRole.id,
      email,
      passwordHash: await hashPassword(password),
      fullName: DEFAULT_ADMIN.fullName,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
      admin: { create: { phone: DEFAULT_ADMIN.phone } },
    },
  });
  console.log(`• Đã tạo admin ${email} (phải đổi mật khẩu khi đăng nhập lần đầu)`);
}
