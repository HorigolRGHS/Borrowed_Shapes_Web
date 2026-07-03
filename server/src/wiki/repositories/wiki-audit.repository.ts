import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { AuditLog } from '../../entities/AuditLog';
import { AuditActionType } from '../../entities/AuditActionType';
import { User } from '../../entities/User';

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
export class WikiAuditRepository extends EntityRepository<AuditLog> {
  constructor(em: EntityManager) {
    super(em, AuditLog);
  }

  // Forked EM so we never flush the caller's pending changes. Non-blocking behavior
  // (swallow + warn) stays in WikiAuditService; this method may throw.
  async insertForked(params: WikiAuditLogParams): Promise<void> {
    const em = this.getEntityManager().fork();
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
  }
}
