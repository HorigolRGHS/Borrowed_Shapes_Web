import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { AuditEntryParams } from '../../audit/types/audit-entry.type';

@Injectable()
export class WikiAuditService {
  private readonly logger = new Logger(WikiAuditService.name);

  constructor(private readonly auditService: AuditService) {}

  recordInCurrentUnitOfWork(params: AuditEntryParams): void {
    this.auditService.recordInCurrentUnitOfWork(params);
  }

  async recordStandalone(params: AuditEntryParams): Promise<void> {
    await this.auditService.recordStandalone(params);
  }
}
