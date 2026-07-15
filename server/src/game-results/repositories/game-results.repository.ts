import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameRun } from '../../entities/GameRun';
import {
  ListGameResultsQueryDto,
  LeaderboardQueryDto,
} from './dto/game-results-response.dto';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class GameResultRepository extends BaseRepository<GameRun> {
  constructor(em: EntityManager) {
    super(em, GameRun);
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

  async findPaginatedRuns(
    query: ListGameResultsQueryDto,
  ): Promise<{ rows: any[]; total: number }> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? 10, 1, 50);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.isCompleted !== undefined) {
      conditions.push('gr."isCompleted" = ?');
      params.push(query.isCompleted);
    }

    if (query.gameProfileId) {
      conditions.push(
        'gr.id IN (SELECT grp."runId" FROM game."GameRunPlayer" grp WHERE grp."gameProfileId" = ?)',
      );
      params.push(query.gameProfileId);
    }

    if (query.search) {
      conditions.push('(gr."lobbyName" ILIKE ? OR gr."lobbyCode" ILIKE ?)');
      const pattern = `%${query.search}%`;
      params.push(pattern, pattern);
    }

    if (query.isPrivate !== undefined) {
      conditions.push('gr."isPrivate" = ?');
      params.push(query.isPrivate);
    }

    if (query.startFrom) {
      conditions.push('gr."startedAt" >= ?');
      params.push(query.startFrom);
    }

    if (query.startTo) {
      conditions.push('gr."startedAt" <= ?');
      params.push(query.startTo);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as count FROM game."GameRun" gr ${whereClause}`;
    const countResult = await this.execute(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    const sortBy = query.sortBy ?? 'startedAt';
    const order = query.order ?? 'desc';
    const sortColumn =
      {
        startedAt: '"startedAt"',
        completedAt: '"completedAt"',
        totalTimeSec: '"totalTimeSec"',
      }[sortBy] ?? '"startedAt"';

    const dataSql = `
      SELECT gr.*
      FROM game."GameRun" gr
      ${whereClause}
      ORDER BY gr.${sortColumn} ${order}, gr.id DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const rows = await this.execute(dataSql, dataParams);

    return { rows: rows || [], total };
  }

  async findRunById(id: string): Promise<any | null> {
    const runSql = `SELECT * FROM game."GameRun" gr WHERE gr.id = ?`;
    const runRows = await this.execute(runSql, [id]);
    return runRows && runRows.length > 0 ? runRows[0] : null;
  }

  async getRunPlayers(runId: string): Promise<any[]> {
    const sql = `
      SELECT
        grp."gameProfileId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        grp."isHost",
        grp."joinedAt",
        a."badgeImageUrl" as "badgeImageUrl",
        a."type" as "badgeType",
        a."seasonMonth" as "badgeSeasonMonth",
        a."expiresAt" as "badgeExpiresAt"
      FROM game."GameRunPlayer" grp
      INNER JOIN game."GameProfile" gp ON gp.id = grp."gameProfileId"
      INNER JOIN auth."User" u ON u.id = gp."userId"
      LEFT JOIN game."Achievement" a ON a.id = gp."equippedAchievementId"
      WHERE grp."runId" = ?
      ORDER BY grp."joinedAt" ASC
    `;
    const rows = await this.execute(sql, [runId]);
    return rows || [];
  }

  async getRunSessions(runId: string): Promise<any[]> {
    const sessionSql = `
      SELECT
        gs.id,
        l.id as "levelId",
        l."displayName" as "levelName",
        l."order" as "levelOrder",
        gs.status,
        gs.result,
        gs."completionTimeSec",
        gs."startedAt",
        gs."endedAt"
      FROM game."GameSession" gs
      INNER JOIN game."Level" l ON l.id = gs."levelId"
      WHERE gs."runId" = ?
      ORDER BY l."order" ASC
    `;
    const rows = await this.execute(sessionSql, [runId]);
    return rows || [];
  }

  async getSessionPlayers(sessionId: string): Promise<any[]> {
    const sql = `
      SELECT
        gsp."gameProfileId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        gsp."isAbsent",
        gsp."leftAt",
        a."badgeImageUrl" as "badgeImageUrl",
        a."type" as "badgeType",
        a."seasonMonth" as "badgeSeasonMonth",
        a."expiresAt" as "badgeExpiresAt"
      FROM game."GameSessionPlayer" gsp
      INNER JOIN game."GameProfile" gp ON gp.id = gsp."gameProfileId"
      INNER JOIN auth."User" u ON u.id = gp."userId"
      LEFT JOIN game."Achievement" a ON a.id = gp."equippedAchievementId"
      WHERE gsp."sessionId" = ?
      ORDER BY gsp."gameProfileId" ASC
    `;
    const rows = await this.execute(sql, [sessionId]);
    return rows || [];
  }

  async findPlayerProfile(gameProfileId: string): Promise<any | null> {
    const profileSql = `
      SELECT
        gp.id as "gameProfileId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        gp."totalSessions",
        gp."totalWins",
        gp."totalLosses",
        gp."totalAbandoned",
        gp."totalPlayTime",
        a."badgeImageUrl" as "badgeImageUrl",
        a."type" as "badgeType",
        a."seasonMonth" as "badgeSeasonMonth",
        a."expiresAt" as "badgeExpiresAt"
      FROM game."GameProfile" gp
      INNER JOIN auth."User" u ON u.id = gp."userId"
      LEFT JOIN game."Achievement" a ON a.id = gp."equippedAchievementId"
      WHERE gp.id = ?
    `;
    const profileRows = await this.execute(profileSql, [gameProfileId]);
    return profileRows && profileRows.length > 0 ? profileRows[0] : null;
  }

  async countPlayerRuns(gameProfileId: string): Promise<number> {
    const countSql = `
      SELECT COUNT(*) as count
      FROM game."GameRunPlayer" grp
      WHERE grp."gameProfileId" = ?
    `;
    const countResult = await this.execute(countSql, [gameProfileId]);
    return Number(countResult[0]?.count || 0);
  }

  async findRunHistoryForPlayer(
    gameProfileId: string,
    query: ListGameResultsQueryDto,
  ): Promise<any[]> {
    const limit = clamp(query.limit ?? 10, 1, 50);
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const offset = (page - 1) * limit;

    const sortBy = query.sortBy ?? 'startedAt';
    const order = query.order ?? 'desc';
    const sortColumn =
      {
        startedAt: 'gr."startedAt"',
        completedAt: 'gr."completedAt"',
        totalTimeSec: 'gr."totalTimeSec"',
      }[sortBy] ?? 'gr."startedAt"';

    const dataSql = `
      SELECT
        gr.*,
        grp."isHost"
      FROM game."GameRun" gr
      INNER JOIN game."GameRunPlayer" grp ON grp."runId" = gr.id
      WHERE grp."gameProfileId" = ?
      ORDER BY ${sortColumn} ${order}, gr.id DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await this.execute(dataSql, [gameProfileId, limit, offset]);
    return rows || [];
  }

  async getLeaderboardData(
    query: LeaderboardQueryDto,
  ): Promise<{ rows: any[]; total: number }> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? 10, 1, 50);
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      'gr."isCompleted" = true',
      'gr."totalTimeSec" IS NOT NULL',
    ];
    const params: any[] = [];

    if (query.scope === 'seasonal') {
      let month = query.seasonMonth;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        month = new Date().toISOString().slice(0, 7);
      }
      const year = parseInt(month.split('-')[0], 10);
      const monthNum = parseInt(month.split('-')[1], 10);
      const startOfTarget = new Date(Date.UTC(year, monthNum - 1, 1));
      const startOfNext = new Date(Date.UTC(year, monthNum, 1));

      conditions.push('gr."completedAt" >= ?');
      conditions.push('gr."completedAt" < ?');
      params.push(startOfTarget, startOfNext);

      const seasonMonthDateStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      conditions.push(
        'gr."lobbyCode" IN (SELECT st.code FROM game."SeasonTeam" st WHERE st."seasonMonth" = ?)',
      );
      params.push(seasonMonthDateStr);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) as count
      FROM game."GameRun" gr
      ${whereClause}
    `;
    const countResult = await this.execute(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    const dataSql = `
      SELECT
        gr.id as "runId",
        gr."lobbyName",
        gr."totalTimeSec",
        gr."completedAt",
        (SELECT COUNT(*)::int FROM game."GameRunPlayer" grp WHERE grp."runId" = gr.id) as "totalPlayers"
      FROM game."GameRun" gr
      ${whereClause}
      ORDER BY gr."totalTimeSec" ASC, gr."completedAt" ASC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const rows = await this.execute(dataSql, dataParams);

    return { rows: rows || [], total };
  }
}
