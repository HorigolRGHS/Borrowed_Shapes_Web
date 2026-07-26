import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditSanitizer } from './audit.sanitizer';
import { AuditEntryParams } from './types/audit-entry.type';
import { EntityManager } from '@mikro-orm/postgresql';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly sanitizer: AuditSanitizer,
  ) {}

  private sanitizeParams(params: AuditEntryParams): AuditEntryParams {
    return {
      ...params,
      oldValue: params.oldValue
        ? this.sanitizer.sanitize(params.oldValue)
        : undefined,
      newValue: params.newValue
        ? this.sanitizer.sanitize(params.newValue)
        : undefined,
    };
  }

  async recordStandalone(params: AuditEntryParams): Promise<void> {
    const sanitized = this.sanitizeParams(params);
    await this.auditLogRepository.createAndFlush(sanitized);
  }

  async recordInCurrentUnitOfWork(params: AuditEntryParams): Promise<void> {
    const sanitized = this.sanitizeParams(params);
    await this.auditLogRepository.persistInCurrentUoW(sanitized);
  }

  recordInTransaction(em: EntityManager, params: AuditEntryParams): void {
    const sanitized = this.sanitizeParams(params);
    this.auditLogRepository.persistInTransaction(em, sanitized);
  }

  async getAdminUserAuditLogs(id: string, page: number, limit: number) {
    return this.auditLogRepository.getAdminUserAuditLogs(id, page, limit);
  }

  async getSystemAuditLogs(query: any) {
    return this.auditLogRepository.getSystemAuditLogs(query);
  }
}
