import { UserStatus } from '../../src/generated/prisma/client.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { RoleCode } from '../../src/common/constants/roles.js';
import { hashPassword } from '../../src/modules/auth/password.js';

// Tài khoản giáo viên chỉ để thử nghiệm ở dev; tài khoản thật do admin tạo (module quản trị người dùng)
const DEMO_TEACHER = {
  email: 'teacher@gmail.com',
  password: 'Teacher123',
  fullName: 'Giáo viên mẫu',
  organization: 'Smart English Exam',
  specialization: 'TOEIC 4 kỹ năng',
};

export async function seedTeacher(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('• Bỏ qua giáo viên mẫu ở môi trường production');
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: DEMO_TEACHER.email },
    select: { id: true },
  });
  if (existing) {
    console.log(`• Giáo viên ${DEMO_TEACHER.email} đã tồn tại, bỏ qua`);
    return;
  }

  const teacherRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.TEACHER } });

  await prisma.user.create({
    data: {
      roleId: teacherRole.id,
      email: DEMO_TEACHER.email,
      passwordHash: await hashPassword(DEMO_TEACHER.password),
      fullName: DEMO_TEACHER.fullName,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      // Tạo dòng teachers trong cùng câu lệnh (nested create chạy trong một transaction)
      teacher: {
        create: {
          organization: DEMO_TEACHER.organization,
          specialization: DEMO_TEACHER.specialization,
          isApproved: true,
        },
      },
    },
  });
  console.log(`• Đã tạo giáo viên mẫu ${DEMO_TEACHER.email} / ${DEMO_TEACHER.password}`);
}
