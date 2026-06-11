import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UnlockAchievementResponseDto } from './dto/unlock-achievement.dto';
import { EntityManager } from '@mikro-orm/postgresql';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { CreateAchievementDto } from './dto/create-achievements.dto';
import { UpdateAchievementDto } from './dto/update-achievements.dto';


@Injectable()
export class AchievementService {
  constructor(private em: EntityManager) { }

  async findAll(): Promise<Achievement[]> {
    return this.em.find(Achievement, {});
  }

  async findAllWithEarnedCount(): Promise<Array<Achievement & { earnedCount: number }>> {
    const rows = await this.em.execute(
      `select a.*, count(ua."achievementId") as "earnedCount"
       from game."Achievement" a
       left join game."UserAchievement" ua on ua."achievementId" = a.id
       group by a.id`,
    );

    return (rows || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      criteriaCode: row.criteriaCode,
      badgeImageUrl: row.badgeImageUrl,
      type: row.type,
      seasonMonth: row.seasonMonth,
      expiresAt: row.expiresAt,
      earnedCount: Number(row.earnedCount || 0),
    }));
  }

  async findAllPaginated(query: {
    page?: number;
    limit?: number;
    type?: string;
    q?: string;
    sortBy?: string;
    order?: string;
  }): Promise<{
    items: Array<Achievement & { earnedCount: number }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
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
      conditions.push('(a.name ILIKE ? OR a.description ILIKE ? OR a."criteriaCode" ILIKE ?)');
      const term = `%${query.q.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const orderDir = query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let orderBy = `ORDER BY "earnedCount" ${orderDir}`; // default
    if (query.sortBy === 'name') {
      orderBy = `ORDER BY a.name ${orderDir}`;
    } else if (query.sortBy === 'type') {
      orderBy = `ORDER BY a.type ${orderDir}`;
    } else if (query.sortBy === 'date') {
      orderBy = `ORDER BY a."expiresAt" ${orderDir}`;
    }

    // 1. Get total count
    const countSql = `
      SELECT COUNT(DISTINCT a.id) as count
      from game."Achievement" a
      ${whereClause}
    `;
    const countResult = await this.em.execute(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    // 2. Get paginated items with earnedCount
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
    const rows = await this.em.execute(dataSql, dataParams);

    const items = (rows || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      criteriaCode: row.criteriaCode,
      badgeImageUrl: row.badgeImageUrl,
      type: row.type,
      seasonMonth: row.seasonMonth,
      expiresAt: row.expiresAt,
      earnedCount: Number(row.earnedCount || 0),
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string): Promise<Achievement & { earnedCount: number }> {
    const achievement = await this.em.findOne(Achievement, { id });
    if (!achievement) {
      throw new NotFoundException('achievements.not_found');
    }
    const earnedCount = await this.em.count(UserAchievement, { achievementId: id });
    return Object.assign(achievement, { earnedCount });
  }

  async findByUser(gameProfileId: string): Promise<UserAchievement[]> {
    return this.em.find(UserAchievement, { gameProfileId }, { populate: ['achievementId'] });
  }

  async create(dto: CreateAchievementDto): Promise<Achievement> {
    const existing = await this.em.findOne(Achievement, { criteriaCode: dto.criteriaCode });
    if (existing) {
      throw new BadRequestException('achievements.already_exists');
    }

    const achievement = this.em.create(Achievement, {
      ...dto,
      seasonMonth: dto.seasonMonth
        ? `${dto.seasonMonth}-01`
        : null,
    });
    await this.em.persistAndFlush(achievement);
    return achievement;
  }

  async update(id: string, dto: UpdateAchievementDto): Promise<Achievement> {
    const achievement = await this.findOne(id);
    if (dto.criteriaCode) {
      const existing = await this.em.findOne(Achievement, { criteriaCode: dto.criteriaCode, id: { $ne: id } });
      if (existing) {
        throw new BadRequestException('achievements.already_exists');
      }
    }
    this.em.assign(achievement, {
      ...dto,
      seasonMonth: dto.seasonMonth
        ? `${dto.seasonMonth}-01`
        : null,
    });
    await this.em.flush();
    return achievement;
  }

  async delete(id: string): Promise<void> {
    const achievement = await this.findOne(id);
    await this.em.removeAndFlush(achievement);
  }

  async search(query: string): Promise<Array<Achievement & { earnedCount: number }>> {
    query = query?.trim();
    if (!query) {
      return [];
    }
    const searchTerm = `%${query}%`;
    const rows = await this.em.execute(
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
      expiresAt: row.expiresAt,
      earnedCount: Number(row.earnedCount || 0),
    }));
  }

  async findUsersByAchievement(achievementId: string) {
    const rows = await this.em.execute(
      `
    select
      gp."id" as "id",
      u."displayName" as "displayName",
      u."imgUrl" as "avatarUrl",
      ua."achievedAt" as "earnedAt"

    from game."UserAchievement" ua

    inner join game."GameProfile" gp
      on gp."id" = ua."gameProfileId"

    inner join auth."User" u
      on u."id" = gp."userId"

    where ua."achievementId" = ?

    order by ua."achievedAt" asc
    `,
      [achievementId],
    );

    console.log(rows);

    return rows || [];
  }

  async unlock(gameProfileId: string, criteriaCode: string): Promise<UnlockAchievementResponseDto> {
    const achievement = await this.em.findOne(Achievement, { criteriaCode });
    if (!achievement) throw new NotFoundException('achievements.not_found');

    const existingUnlock = await this.em.findOne(UserAchievement, {
      gameProfileId,
      achievementId: achievement.id,
    });

    if (existingUnlock) throw new BadRequestException('achievements.already_unlocked');

    const userAchievement = this.em.create(UserAchievement, {
      gameProfileId,
      achievementId: achievement.id,
    });

    await this.em.persistAndFlush(userAchievement);

    return {
      unlocked: true,
      achievement: {
        id: achievement.id,
        name: achievement.name,
        badgeImageUrl: achievement.badgeImageUrl,
      }
    };
  }
}