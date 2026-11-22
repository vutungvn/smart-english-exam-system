import { Module } from '@nestjs/common';
import { AdminAuditLogsController } from './admin-audit-logs.controller.js';
import { AdminAuditLogsService } from './admin-audit-logs.service.js';

@Module({
  controllers: [AdminAuditLogsController],
  providers: [AdminAuditLogsService],
})
export class AdminAuditLogsModule {}
