// Chạy: npm run db:seed. Idempotent: chạy lại nhiều lần không lỗi, không tạo trùng.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedAdmin } from './admin.seed.js';
import { seedRoles } from './roles.seed.js';
import { seedTeacher } from './teacher.seed.js';
import { seedStudent } from './student.seed.js';
import { seedSubjects } from './subjects.seed.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu DATABASE_URL trong backend/.env');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  await seedRoles(prisma);
  await seedAdmin(prisma);
  await seedTeacher(prisma);
  await seedStudent(prisma);
  await seedSubjects(prisma);
  // Sau giáo viên mẫu và chủ đề: đề mẫu cần cả hai
  // await seedDemoExams(prisma);
  console.log('Seed xong');
} finally {
  await prisma.$disconnect();
}
