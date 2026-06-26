import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UnlockAchievementResponseDto } from './dto/unlock-achievement.dto';
import { EntityManager } from '@mikro-orm/postgresql';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { CreateAchievementDto } from './dto/create-achievements.dto';
import { UpdateAchievementDto } from './dto/update-achievements.dto';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';
import { randomUUID } from 'node:crypto';

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
/**
 * Calculate the effective expiration date for an achievement.
 *
 * - PERMANENT achievements: return the original expiresAt (usually null).
 * - SEASONAL achievements: extend equippable period to the end of the
 *   month AFTER the season month.
 *
 * Example: seasonMonth = '2026-04-01' (April 2026)
 *   → original expiresAt = end of April (2026-04-30 23:59:59)
 *   → effective expiresAt = end of May  (2026-05-31 23:59:59)
 *   → user can equip during the entire month of May
 *   → once June starts and new season achievements are awarded, this expires
 */
export function getEffectiveExpiresAt(
  type: string,
  seasonMonth?: string | Date | null,
  expiresAt?: Date | string | null,
): Date | null {
  if (type !== 'SEASONAL') {
    return expiresAt ? new Date(expiresAt) : null;
  }

  if (seasonMonth) {
    // seasonMonth is always stored as 'YYYY-MM-01' (first day of the season month)
    const date = new Date(seasonMonth);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-indexed

    // month + 2 with day 0 = last day of (month + 1)
    // e.g. month=3 (April) → new Date(Date.UTC(year, month + 2, 0, 23, 59, 59, 999)) = May 31 23:59:59.999Z
    return new Date(Date.UTC(year, month + 2, 0, 23, 59, 59, 999));
  }

  // Fallback: if seasonMonth is missing, derive from expiresAt
  // expiresAt is typically end of the season month, so add 1 month
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed

  // month + 2 with day 0 = last day of (month + 1)
  return new Date(Date.UTC(year, month + 2, 0, 23, 59, 59, 999));
}

@Injectable()
export class AchievementService {
  constructor(
    private em: EntityManager,
    private readonly r2: R2StorageService,
    private readonly config: ConfigService,
  ) { }

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
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
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
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
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

  async create(dto: CreateAchievementDto): Promise<null> {
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
    return null;
  }

  async update(id: string, dto: UpdateAchievementDto): Promise<null> {
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
    return null;
  }

  async delete(id: string): Promise<void> {
    const achievement = await this.findOne(id);
    if (achievement.badgeImageUrl) {
      const match = achievement.badgeImageUrl.match(/(achievement\/[a-zA-Z0-9.\-_]+)$/);
      if (match) {
        const key = match[1];
        try {
          await this.r2.deleteObject(key);
        } catch (err) {
          console.error(`Failed to delete R2 object for key ${key}:`, err);
        }
      }
    }
    await this.em.removeAndFlush(achievement);
  }

  async uploadBadge(
    buffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<string> {
    const ext = MIME_EXT_MAP[mimeType];
    if (!ext) {
      throw new BadRequestException('achievements.upload_invalid_type');
    }

    const key = `achievement/${randomUUID()}${ext}`;
    await this.r2.putObject(key, buffer, mimeType);

    const base =
      this.config.get<string>('R2_PUBLIC_BASE_URL') ??
      this.config.getOrThrow<string>('R2_PUBLIC_DEV_URL');
    const publicBaseUrl = base.replace(/\/+$/, '');

    return `${publicBaseUrl}/${key}`;
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
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
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

  async findShowcaseForUser(gameProfileId: string) {
    const now = new Date();

    const rows = await this.em.execute(
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

    const permanent: any[] = [];
    const seasonMap = new Map<string, {
      seasonKey: string;
      expiresAt: string | null;
      isActive: boolean;
      achievements: any[];
    }>();

    let totalEarned = 0;
    let permanentEarned = 0;
    let seasonalEarned = 0;

    for (const row of rows || []) {
      const owned = !!row.achievedAt;
      const isPermanent = row.type === 'PERMANENT';
      const expiresAt = getEffectiveExpiresAt(row.type, row.seasonMonth, row.expiresAt);
      const isExpired = expiresAt ? expiresAt < now : false;
      const equippable = owned && (!isExpired || isPermanent);

      if (owned) {
        totalEarned++;
        if (isPermanent) permanentEarned++;
        else seasonalEarned++;
      }

      const item = {
        id: row.id,
        name: row.name,
        description: row.description,
        criteriaCode: row.criteriaCode,
        badgeImageUrl: row.badgeImageUrl,
        type: row.type,
        seasonMonth: row.seasonMonth,
        expiresAt: expiresAt,
        owned,
        achievedAt: row.achievedAt ?? null,
        equippable,
      };

      if (isPermanent) {
        permanent.push(item);
      } else {
        // Seasonal: skip unowned achievements if their season (earning period) has ended
        const originalExpires = row.expiresAt ? new Date(row.expiresAt) : null;
        const isSeasonEnded = originalExpires ? originalExpires < now : false;
        if (!owned && isSeasonEnded) continue;

        const seasonKey = row.seasonMonth
          ? String(row.seasonMonth).slice(0, 7)
          : 'unknown';

        if (!seasonMap.has(seasonKey)) {
          seasonMap.set(seasonKey, {
            seasonKey,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            isActive: !isExpired,
            achievements: [],
          });
        }
        seasonMap.get(seasonKey)!.achievements.push(item);
      }
    }

    return {
      permanent,
      seasonal: Array.from(seasonMap.values()),
      stats: { totalEarned, permanentEarned, seasonalEarned },
    };
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