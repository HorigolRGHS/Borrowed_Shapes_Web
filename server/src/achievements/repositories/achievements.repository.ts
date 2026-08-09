import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Achievement } from '../../entities/Achievement';
import { UserAchievement } from '../../entities/UserAchievement';
import { GameProfile } from '../../entities/GameProfile';

@Injectable()
export class AchievementRepository extends BaseRepository<Achievement> {
  constructor(em: EntityManager) {
    super(em, Achievement);
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    return this.em.execute(sql, params);
  }

  async flush(): Promise<void> {
    await this.em.flush();
  }

  async persistAndFlush(entity: any): Promise<void> {
    await this.em.persistAndFlush(entity);
  }

  async removeAndFlush(entity: any): Promise<void> {
    await this.em.removeAndFlush(entity);
  }

  async findOneByCriteria(criteriaCode: string): Promise<Achievement | null> {
    return this.findOne({ criteriaCode });
  }

  async findOneByCriteriaExcludeId(
    criteriaCode: string,
    id: string,
  ): Promise<Achievement | null> {
    return this.findOne({ criteriaCode, id: { $ne: id } });
  }

  async countUserAchievements(achievementId: string): Promise<number> {
    return this.em.count(UserAchievement, { achievementId });
  }

  async findUserAchievements(
    gameProfileId: string,
  ): Promise<UserAchievement[]> {
    return this.em.find(
      UserAchievement,
      { gameProfileId },
      { populate: ['achievementId'] },
    );
  }

  async findOneUserAchievement(
    gameProfileId: string,
    achievementId: string,
  ): Promise<UserAchievement | null> {
    return this.em.findOne(
      UserAchievement,
      { gameProfileId, achievementId }
    );
  }

  createAchievement(data: any): Achievement {
    return this.create(data);
  }

  createUserAchievement(data: any): UserAchievement {
    return this.em.create(UserAchievement, data);
  }

  async findGameProfilesWithEquippedAchievements(): Promise<GameProfile[]> {
    return this.em.find(
      GameProfile,
      { equippedAchievementId: { $ne: null } },
      { populate: ['equippedAchievementId'] },
    );
  }

  async findPaginatedWithEarnedCount(query: {
    page?: number;
    limit?: number;
    type?: string;
    q?: string;
    sortBy?: string;
    order?: string;
  }): Promise<{ items: any[]; total: number }> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 6));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.type && query.type !== 'all') {
      conditions.push('a.type = ?');
      params.push(query.type.toUpperCase());
    }

    if (query.q && query.q.trim()) {
      conditions.push(
        '(a.name ILIKE ? OR a.description ILIKE ? OR a."criteriaCode" ILIKE ?)',
      );
      const term = `%${query.q.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderDir = query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let orderBy = `ORDER BY "earnedCount" ${orderDir}, a.name ASC, a.id ASC`; // default
    if (query.sortBy === 'name') {
      orderBy = `ORDER BY a.name ${orderDir}, a.id ASC`;
    } else if (query.sortBy === 'type') {
      orderBy = `ORDER BY a.type ${orderDir}, a.name ASC, a.id ASC`;
    } else if (query.sortBy === 'date') {
      orderBy = `ORDER BY a."expiresAt" ${orderDir} NULLS LAST, a.name ASC, a.id ASC`;
    }

    const countSql = `
      SELECT COUNT(DISTINCT a.id) as count
      from game."Achievement" a
      ${whereClause}
    `;
    const countResult = await this.execute(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    const dataSql = `
      select a.*, count(ua."achievementId") as "earnedCount"
      from game."Achievement" a
      left join game."UserAchievement" ua on ua."achievementId" = a.id
      ${whereClause}
      group by a.id
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const rows = await this.execute(dataSql, dataParams);

    const items = (rows || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      criteriaCode: row.criteriaCode,
      badgeImageUrl: row.badgeImageUrl,
      type: row.type,
      seasonMonth: row.seasonMonth,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
      earnedCount: Number(row.earnedCount || 0),
    }));

    return { items, total };
  }

  async searchWithEarnedCount(query: string): Promise<any[]> {
    const searchTerm = `%${query}%`;
    const rows = await this.execute(
      `select a.*, count(ua."achievementId") as "earnedCount"
     from game."Achievement" a
     left join game."UserAchievement" ua on ua."achievementId" = a.id
     where a.name ilike ? or a.description ilike ?
     group by a.id`,
      [searchTerm, searchTerm],
    );

    return (rows || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      criteriaCode: row.criteriaCode,
      badgeImageUrl: row.badgeImageUrl,
      type: row.type,
      seasonMonth: row.seasonMonth,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
      earnedCount: Number(row.earnedCount || 0),
    }));
  }

  async findUsersByAchievementDetailed(achievementId: string): Promise<any[]> {
    const rows = await this.execute(
      `
    select
      gp."id" as "gameProfileId",
      u."id" as "userId",
      u."displayName" as "displayName",
      u."imgUrl" as "avatarUrl",
      u."updatedAt" as "updatedAt",
      ua."achievedAt" as "earnedAt",
      eq."badgeImageUrl" as "equippedFrameUrl"

    from game."UserAchievement" ua

    inner join game."GameProfile" gp
      on gp."id" = ua."gameProfileId"

    inner join auth."User" u
      on u."id" = gp."userId"

    left join game."Achievement" eq
      on eq."id" = gp."equippedAchievementId"

    where ua."achievementId" = ?

    order by ua."achievedAt" asc
    `,
      [achievementId],
    );
    return rows || [];
  }

  async findShowcaseRows(gameProfileId: string): Promise<any[]> {
    const rows = await this.execute(
      `SELECT
         a.id,
         a.name,
         a.description,
         a."criteriaCode",
         a."badgeImageUrl",
         a.type,
         a."seasonMonth",
         a."expiresAt",
         ua."achievedAt"
       FROM game."Achievement" a
       LEFT JOIN game."UserAchievement" ua
         ON ua."achievementId" = a.id
         AND ua."gameProfileId" = ?
       ORDER BY a.type ASC, a."seasonMonth" DESC NULLS LAST, a.name ASC`,
      [gameProfileId],
    );
    return rows || [];
  }
}
