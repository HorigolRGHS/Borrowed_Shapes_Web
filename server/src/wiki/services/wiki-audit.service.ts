import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuditLog } from '../../entities/AuditLog';
import { User } from '../../entities/User';
import { AuditActionType } from '../../entities/AuditActionType';

export interface WikiAuditLogParams {
  userId: string;
  actionType: AuditActionType;
  entityName: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}

@Injectable()
export class WikiAuditService {
  private readonly logger = new Logger(WikiAuditService.name);

  constructor(private readonly em: EntityManager) {}

  async log(params: WikiAuditLogParams): Promise<void> {
    // Use a forked EM so we don't accidentally flush the caller's pending changes.
    // Auditing is intentionally non-blocking — failures here log a warning, never throw.
    const em = this.em.fork();
    try {
      em.create(AuditLog, {
        userId: em.getReference(User, params.userId),
        actionType: params.actionType,
        entityName: params.entityName,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
      });
      await em.flush();
    } catch (err) {
      this.logger.warn(
        `Audit log failed for userId=${params.userId} ${params.entityName}:${params.entityId} action=${params.actionType}: ${err}`,
      );
    }
  }
}
