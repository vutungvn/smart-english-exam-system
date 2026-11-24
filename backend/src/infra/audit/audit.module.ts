import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditContext } from './audit-context.js';
import { AuditInterceptor } from './audit.interceptor.js';

// Global: Service ở mọi module inject AuditContext để gửi before/after cho route gắn @Audit
@Global()
@Module({
  providers: [AuditContext, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
  exports: [AuditContext],
})
export class AuditModule {}
