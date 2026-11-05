import './setup-env.js';
import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedRoles } from '../../prisma/seed/roles.seed.js';
import { seedSubjects } from '../../prisma/seed/subjects.seed.js';

const connect = () =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/**
 * Chạy một lần trước toàn bộ test e2e: xóa sạch schema, chạy lại migration như production
 * (migrate deploy), rồi seed dữ liệu danh mục (vai trò, chương trình thi, chủ đề). Dữ liệu riêng
 * của từng test (người dùng, đề) do test tự tạo
 */
export default async function setup(): Promise<void> {
  const reset = connect();
  try {
    await reset.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await reset.$executeRawUnsafe('CREATE SCHEMA public');
  } finally {
    await reset.$disconnect();
  }

  // prisma.config.ts nạp .env nhưng dotenv không đè biến đã có, nên vẫn dùng DATABASE_URL của test
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });

  const prisma = connect();
  try {
    await seedRoles(prisma);
    await seedSubjects(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
