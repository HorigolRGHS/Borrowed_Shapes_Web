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

  constructor(private em: EntityManager) {}

  async log(params: WikiAuditLogParams): Promise<void> {
    try {
      this.em.create(AuditLog, {
        userId: this.em.getReference(User, params.userId),
        actionType: params.actionType,
        entityName: params.entityName,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
      });
      await this.em.flush();
    } catch (err) {
      this.logger.warn(`Audit log failed for ${params.entityName}:${params.entityId} action=${params.actionType}: ${err}`);
    }
  }
}
