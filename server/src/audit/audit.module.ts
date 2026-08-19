import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditSanitizer } from './audit.sanitizer';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { RateLimitLogRepository } from './repositories/rate-limit-log.repository';

@Module({
  providers: [
    AuditLogRepository,
    RateLimitLogRepository,
    AuditService,
    AuditSanitizer,
  ],
  exports: [AuditLogRepository, RateLimitLogRepository, AuditService],
})
export class AuditModule {}
