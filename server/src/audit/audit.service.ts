import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { RateLimitLogRepository } from './repositories/rate-limit-log.repository';
import { AuditSanitizer } from './audit.sanitizer';
import { AuditEntryParams } from './types/audit-entry.type';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../entities/User';
import { RateLimitLog } from '../entities/RateLimitLog';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly rateLimitLogRepository: RateLimitLogRepository,
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

  async recordRateLimit(params: {
    userId?: string | null;
    ipAddress?: string | null;
    actionType: string;
  }): Promise<void> {
    const log = new RateLimitLog();
    log.actionType = params.actionType;
    if (params.ipAddress) {
      log.ipAddress = params.ipAddress;
    }
    if (params.userId) {
      log.userId = this.rateLimitLogRepository
        .getEntityManager()
        .getReference(User, params.userId);
    }
    await this.rateLimitLogRepository.persistAndFlush(log);
  }

  async getAdminUserAuditLogs(id: string, page: number, limit: number) {
    return this.auditLogRepository.getAdminUserAuditLogs(id, page, limit);
  }

  async getAdminUserRateLimitLogs(id: string, page: number, limit: number) {
    const qb = this.rateLimitLogRepository.createQueryBuilder('r');
    qb.where({ userId: id })
      .orderBy({ createdAt: 'DESC' })
      .limit(limit)
      .offset((page - 1) * limit);

    return qb.getResultAndCount();
  }

  async getSystemAuditLogs(query: any) {
    return this.auditLogRepository.getSystemAuditLogs(query);
  }
}

