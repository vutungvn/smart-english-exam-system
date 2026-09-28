import { Injectable } from '@nestjs/common';
import { PrismaService } from './module/prisma/prisma.service.js';

export interface DatabaseCheckResult {
  database: string;
  version: string;
  roleCount: number;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  // Route tạm để thử kết nối DB, sau này thay bằng GET /system/status
  async checkDatabase(): Promise<DatabaseCheckResult> {
    const [info] = await this.prisma.$queryRaw<{ database: string; version: string }[]>`
      SELECT current_database() AS database, version() AS version
    `;
    const roleCount = await this.prisma.role.count();

    return { database: info.database, version: info.version, roleCount };
  }
}
