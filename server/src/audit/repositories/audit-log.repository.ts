import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BaseRepository } from '../../common/repositories/base.repository';
import { AuditLog } from '../../entities/AuditLog';
import { AuditEntryParams } from '../types/audit-entry.type';
import { User } from '../../entities/User';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(em: EntityManager) {
    super(em, AuditLog);
  }

  private createEntity(params: AuditEntryParams, em: EntityManager): AuditLog {
    const auditLog = new AuditLog();
    auditLog.actionType = params.actionType as any;
    auditLog.entityName = params.entityName;
    auditLog.entityId = params.entityId;
    auditLog.oldValue = params.oldValue;
    auditLog.newValue = params.newValue;
    if (params.ipAddress) {
      auditLog.ipAddress = params.ipAddress;
    }

    if (params.userId) {
      auditLog.userId = em.getReference(User, params.userId);
    }

    return auditLog;
  }

  async persistInCurrentUoW(params: AuditEntryParams): Promise<void> {
    const log = this.createEntity(params, this.getEntityManager());
    this.getEntityManager().persist(log);
  }

  async createAndFlush(params: AuditEntryParams): Promise<void> {
    const log = this.createEntity(params, this.getEntityManager());
    await this.getEntityManager().persistAndFlush(log);
  }

  persistInTransaction(em: EntityManager, params: AuditEntryParams): void {
    const log = this.createEntity(params, em);
    em.persist(log);
  }

  async getAdminUserAuditLogs(id: string, page: number, limit: number) {
    const qb = this.createQueryBuilder('a');
    qb.where({ userId: id })
      .orWhere({ entityName: 'User', entityId: id })
      .orderBy({ timestamp: 'DESC' })
      .limit(limit)
      .offset((page - 1) * limit);

    return qb.getResultAndCount();
  }

  async getSystemAuditLogs(query: any) {
    const {
      page = 1,
      limit = 20,
      actionType,
      entityName,
      entityId,
      userId,
      search,
      from,
      to,
    } = query;

    const qb = this.createQueryBuilder('a');
    qb.leftJoinAndSelect('a.userId', 'u');

    if (actionType) {
      qb.andWhere({ actionType });
    }
    if (entityName) {
      qb.andWhere({ entityName });
    }
    if (entityId) {
      qb.andWhere({ entityId });
    }
    if (userId) {
      qb.andWhere({ userId });
    }
    if (from) {
      qb.andWhere({ timestamp: { $gte: new Date(from) } });
    }
    if (to) {
      qb.andWhere({ timestamp: { $lte: new Date(to) } });
    }
    if (search) {
      qb.andWhere({
        $or: [
          { 'u.email': { $ilike: `%${search}%` } },
          { 'u.displayName': { $ilike: `%${search}%` } },
          { entityName: { $ilike: `%${search}%` } },
          { entityId: { $ilike: `%${search}%` } },
        ],
      });
    }

    qb.orderBy({ timestamp: 'DESC' })
      .limit(limit)
      .offset((page - 1) * limit);

    return qb.getResultAndCount();
  }
}
