import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { raw } from '@mikro-orm/core';
import { User } from '../../entities/User';
import {
  AccountFilterRole,
  AccountFilterStatus,
  AccountSortBy,
  SortOrder,
} from '../dto/admin-account-query.dto';

@Injectable()
export class AccountRepository extends BaseRepository<User> {
  constructor(em: EntityManager) {
    super(em, User);
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }

  async persist(entity: any): Promise<void> {
    this.getEntityManager().persist(entity);
  }

  async persistAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().persistAndFlush(entity);
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne({ id });
  }

  async getAdminUsers(query: any): Promise<[User[], number]> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      sortBy = AccountSortBy.CREATED_AT,
      sort = SortOrder.DESC,
    } = query;
    const qb = this.createQueryBuilder('u');

    if (search) {
      qb.andWhere({
        $or: [
          { id: { $ilike: `%${search}%` } },
          { email: { $ilike: `%${search}%` } },
          { displayName: { $ilike: `%${search}%` } },
        ],
      });
    }

    if (role && role !== AccountFilterRole.ALL) {
      qb.andWhere({ role });
    }

    if (status && status !== AccountFilterStatus.ALL) {
      if (status === AccountFilterStatus.ACTIVE) {
        qb.andWhere({ deletedAt: null, isBanned: false });
      } else if (status === AccountFilterStatus.BANNED) {
        qb.andWhere({ deletedAt: null, isBanned: true });
      } else if (status === AccountFilterStatus.DELETED) {
        qb.andWhere({ deletedAt: { $ne: null } });
      }
    } else {
      qb.andWhere({ deletedAt: null });
    }

    if (sortBy === AccountSortBy.ROLE) {
      qb.orderBy({ role: sort, createdAt: 'DESC' });
    } else if (sortBy === AccountSortBy.STATUS) {
      qb.orderBy({
        [raw(
          'CASE WHEN u."deletedAt" IS NOT NULL THEN 3 WHEN u."isBanned" = true THEN 2 ELSE 1 END',
        )]: sort,
        createdAt: 'DESC',
      });
    } else if (sortBy === AccountSortBy.ONLINE_STATUS) {
      qb.orderBy({
        [raw(
          'COALESCE((SELECT "isOnline" FROM auth."UserOnlineStatus" os WHERE os."userId" = u.id), false)',
        )]: sort,
        createdAt: 'DESC',
      });
    } else {
      qb.orderBy({ createdAt: sort });
    }

    qb.limit(limit).offset((page - 1) * limit);

    return qb.getResultAndCount();
  }

  async countAdmins(): Promise<number> {
    return this.count({ role: 'ADMIN' as any, deletedAt: null });
  }

  async banUser(
    userId: string,
    reason: string,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.nativeUpdate(
      { id: userId },
      {
        isBanned: true,
        bannedAt: new Date(),
        banReason: reason,
        banExpiresAt: expiresAt,
      },
    );
  }

  async unbanUser(userId: string): Promise<void> {
    await this.nativeUpdate(
      { id: userId },
      { isBanned: false, bannedAt: null, banReason: null, banExpiresAt: null },
    );
  }

  async deleteUser(userId: string): Promise<void> {
    await this.nativeUpdate({ id: userId }, { deletedAt: new Date() });
  }

  async restoreUser(userId: string): Promise<void> {
    await this.nativeUpdate({ id: userId }, { deletedAt: null });
  }

  async countTotalUsers(): Promise<number> {
    return this.count({ deletedAt: null });
  }

  async countBannedUsers(): Promise<number> {
    return this.count({ isBanned: true });
  }

  async executeRaw(sql: string): Promise<any> {
    return this.getEntityManager().getConnection().execute(sql);
  }
}
