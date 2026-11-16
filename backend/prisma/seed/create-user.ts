// Tạo tài khoản giáo viên/học viên từ dòng lệnh (dùng ở production khi chưa có màn admin quản lý
// người dùng, SPRINT-66). Mật khẩu sinh ngẫu nhiên, in ra một lần; người dùng phải đổi khi đăng nhập.
//   npm run user:create -- --role TEACHER --email gv@example.com --name "Nguyễn Văn A"
// Trên máy chủ (container migrate có tsx):
//   docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod run --rm migrate \
//     npm run user:create -- --role TEACHER --email gv@example.com --name "Nguyễn Văn A"
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserStatus } from '../../src/generated/prisma/client.js';
import { RoleCode } from '../../src/common/constants/roles.js';
import { hashPassword } from '../../src/modules/auth/password.js';

const ROLES = [RoleCode.TEACHER, RoleCode.STUDENT] as const;
type CreatableRole = (typeof ROLES)[number];

/** 14 ký tự, đủ chữ hoa, chữ thường, số (khớp yêu cầu độ mạnh khi đổi mật khẩu); bỏ ký tự dễ nhầm */
function randomPassword(): string {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789'];
  const all = groups.join('');
  const chars = [
    ...groups.map((group) => group[randomInt(group.length)]),
    ...Array.from({ length: 11 }, () => all[randomInt(all.length)]),
  ];
  // Xáo trộn để ký tự bắt buộc không luôn đứng đầu
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const { values } = parseArgs({
  options: {
    role: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    organization: { type: 'string', default: 'Smart English Exam' },
    specialization: { type: 'string', default: 'TOEIC 4 kỹ năng' },
  },
});

const role = values.role?.toUpperCase() as CreatableRole | undefined;
const email = values.email?.trim().toLowerCase();
const fullName = values.name?.trim();
if (!role || !ROLES.includes(role) || !email?.includes('@') || !fullName) {
  console.error(
    'Cách dùng: npm run user:create -- --role TEACHER|STUDENT --email <email> --name "<họ tên>"',
  );
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Thiếu DATABASE_URL');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    console.error(`Email ${email} đã có tài khoản`);
    process.exitCode = 1;
  } else {
    const password = randomPassword();
    const { id: roleId } = await prisma.role.findUniqueOrThrow({ where: { code: role } });
    await prisma.user.create({
      data: {
        roleId,
        email,
        passwordHash: await hashPassword(password),
        fullName,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        mustChangePassword: true,
        ...(role === RoleCode.TEACHER
          ? {
              teacher: {
                create: {
                  organization: values.organization,
                  specialization: values.specialization,
                  isApproved: true,
                },
              },
            }
          : { student: { create: {} } }),
      },
    });
    console.log(`Đã tạo ${role} ${email}`);
    console.log(`Mật khẩu (chỉ hiện lần này, đổi ngay sau khi đăng nhập): ${password}`);
  }
} finally {
  await prisma.$disconnect();
}
