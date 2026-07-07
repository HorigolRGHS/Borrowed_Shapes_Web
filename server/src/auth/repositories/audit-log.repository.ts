import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { AuditLog } from '../../entities/AuditLog';

@Injectable()
export class AuditLogRepository extends EntityRepository<AuditLog> {
  constructor(em: EntityManager) {
    super(em, AuditLog);
  }
}
