import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { AuditLog } from '../../entities/AuditLog';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(em: EntityManager) {
    super(em, AuditLog);
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }

  async persist(entity: any): void {
    this.getEntityManager().persist(entity);
  }

  async persistAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().persistAndFlush(entity);
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
