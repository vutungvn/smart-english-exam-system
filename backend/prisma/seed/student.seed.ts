import { UserStatus } from '../../src/generated/prisma/client.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { RoleCode } from '../../src/common/constants/roles.js';
import { hashPassword } from '../../src/modules/auth/password.js';

// Tài khoản học viên chỉ để thử luồng làm bài ở dev (học viên thật tự đăng ký, xác minh email)
const DEMO_STUDENT = {
  email: 'student@gmail.com',
  password: '12345678',
  fullName: 'Học viên',
};

export async function seedStudent(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('• Bỏ qua học viên mẫu ở môi trường production');
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: DEMO_STUDENT.email },
    select: { id: true },
  });
  if (existing) {
    console.log(`• Học viên ${DEMO_STUDENT.email} đã tồn tại, bỏ qua`);
    return;
  }

  const studentRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.STUDENT } });

  await prisma.user.create({
    data: {
      roleId: studentRole.id,
      email: DEMO_STUDENT.email,
      passwordHash: await hashPassword(DEMO_STUDENT.password),
      fullName: DEMO_STUDENT.fullName,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      // Tạo dòng students trong cùng câu lệnh (nested create chạy trong một transaction)
      student: { create: {} },
    },
  });
  console.log(`• Đã tạo học viên mẫu ${DEMO_STUDENT.email} / ${DEMO_STUDENT.password}`);
}
