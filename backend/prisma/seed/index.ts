// Chạy: npm run db:seed. Idempotent: chạy lại nhiều lần không lỗi, không tạo trùng.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedAdmin } from './admin.seed.js';
import { seedRoles } from './roles.seed.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu DATABASE_URL trong backend/.env');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  await seedRoles(prisma);
  await seedAdmin(prisma);
  console.log('Seed xong');
} finally {
  await prisma.$disconnect();
}
