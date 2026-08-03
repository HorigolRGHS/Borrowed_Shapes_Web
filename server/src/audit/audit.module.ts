import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditSanitizer } from './audit.sanitizer';
import { AuditLogRepository } from './repositories/audit-log.repository';

@Module({
  providers: [AuditLogRepository, AuditService, AuditSanitizer],
  exports: [AuditLogRepository, AuditService],
})
export class AuditModule {}
