import { Injectable, Logger } from '@nestjs/common';
import {
  WikiAuditRepository,
  WikiAuditLogParams,
} from '../repositories/wiki-audit.repository';

@Injectable()
export class WikiAuditService {
  private readonly logger = new Logger(WikiAuditService.name);

  constructor(private readonly auditRepo: WikiAuditRepository) {}

  async log(params: WikiAuditLogParams): Promise<void> {
    // Auditing is intentionally non-blocking — failures log a warning, never throw.
    try {
      await this.auditRepo.insertForked(params);
    } catch (err) {
      this.logger.warn(
        `Audit log failed for userId=${params.userId} ${params.entityName}:${params.entityId} action=${params.actionType}: ${err}`,
      );
    }
  }
}
