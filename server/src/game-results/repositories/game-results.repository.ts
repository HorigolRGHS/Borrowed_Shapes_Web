import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameRun } from '../../entities/GameRun';
import {
  ListGameResultsQueryDto,
  LeaderboardQueryDto,
} from '../dto/game-results-response.dto';

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

    if (query.isAbandoned) {
      conditions.push('gr."isCompleted" = false');
      conditions.push(
        `(gr."completedAt" IS NOT NULL OR gr."startedAt" < NOW() - INTERVAL '12 hours' OR EXISTS (SELECT 1 FROM game."GameSession" gs WHERE gs."runId" = gr.id AND gs.id = (SELECT gs2.id FROM game."GameSession" gs2 INNER JOIN game."Level" l2 ON l2.id = gs2."levelId" WHERE gs2."runId" = gr.id ORDER BY l2."order" DESC, gs2."startedAt" DESC LIMIT 1) AND (gs.status IN ('ABANDONED', 'FINISHED') OR gs."endedAt" IS NOT NULL)))`,
      );
    } else if (query.isCompleted !== undefined) {
      conditions.push('gr."isCompleted" = ?');
      params.push(query.isCompleted);
      if (query.isCompleted === false) {
        conditions.push('gr."completedAt" IS NULL');
        conditions.push("gr.\"startedAt\" >= NOW() - INTERVAL '12 hours'");
        conditions.push(
          `NOT EXISTS (SELECT 1 FROM game."GameSession" gs WHERE gs."runId" = gr.id AND gs.id = (SELECT gs2.id FROM game."GameSession" gs2 INNER JOIN game."Level" l2 ON l2.id = gs2."levelId" WHERE gs2."runId" = gr.id ORDER BY l2."order" DESC, gs2."startedAt" DESC LIMIT 1) AND (gs.status IN ('ABANDONED', 'FINISHED') OR gs."endedAt" IS NOT NULL))`,
        );
      }
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
        u.id as "userId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        u."updatedAt" as "updatedAt",
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
        u.id as "userId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        u."updatedAt" as "updatedAt",
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
        u.id as "userId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        u."updatedAt" as "updatedAt",
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

      conditions.push(
        '(UPPER(TRIM(gr."lobbyCode")) IN (SELECT UPPER(TRIM(st.code)) FROM game."SeasonTeam" st WHERE TO_CHAR(st."seasonMonth", \'YYYY-MM\') = ?) OR gr.id IN (SELECT grp."runId" FROM game."GameRunPlayer" grp JOIN game."SeasonTeamMember" stm ON stm."gameProfileId" = grp."gameProfileId" WHERE TO_CHAR(stm."seasonMonth", \'YYYY-MM\') = ?))',
      );
      params.push(month, month);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `
      WITH team_runs AS (
        SELECT
          gr.id as "runId",
          gr."lobbyName",
          gr."lobbyCode",
          gr."totalTimeSec",
          gr."completedAt",
          STRING_AGG(DISTINCT grp."gameProfileId", ',' ORDER BY grp."gameProfileId") as "teamSignature",
          CASE
            WHEN COUNT(DISTINCT grp."gameProfileId") = COUNT(DISTINCT stm."gameProfileId")
                 AND COUNT(DISTINCT stm."gameProfileId") > 0
            THEN MAX(st.id)
            ELSE NULL
          END as "seasonTeamId",
          CASE
            WHEN COUNT(DISTINCT grp."gameProfileId") = COUNT(DISTINCT stm."gameProfileId")
                 AND COUNT(DISTINCT stm."gameProfileId") > 0
            THEN MAX(st.name)
            ELSE NULL
          END as "seasonTeamName"
        FROM game."GameRun" gr
        LEFT JOIN game."GameRunPlayer" grp ON grp."runId" = gr.id
        LEFT JOIN game."SeasonTeamMember" stm
          ON stm."gameProfileId" = grp."gameProfileId"
         AND TO_CHAR(stm."seasonMonth", 'YYYY-MM') = TO_CHAR(gr."completedAt", 'YYYY-MM')
        LEFT JOIN game."SeasonTeam" st
          ON st.id = stm."teamId"
          OR (st.code IS NOT NULL AND UPPER(TRIM(st.code)) = UPPER(TRIM(gr."lobbyCode")))
        ${whereClause}
        GROUP BY gr.id, gr."lobbyName", gr."lobbyCode", gr."totalTimeSec", gr."completedAt"
      ),
      ranked_team_runs AS (
        SELECT
          tr.*,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(
              tr."seasonTeamId",
              NULLIF(UPPER(TRIM(tr."lobbyCode")), ''),
              tr."teamSignature"
            )
            ORDER BY tr."totalTimeSec" ASC, tr."completedAt" ASC
          ) as rn
        FROM team_runs tr
      )
      SELECT COUNT(*) as count FROM ranked_team_runs WHERE rn = 1
    `;
    const countResult = await this.execute(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    const dataSql = `
      WITH team_runs AS (
        SELECT
          gr.id as "runId",
          gr."lobbyName",
          gr."lobbyCode",
          gr."totalTimeSec",
          gr."completedAt",
          STRING_AGG(DISTINCT grp."gameProfileId", ',' ORDER BY grp."gameProfileId") as "teamSignature",
          CASE
            WHEN COUNT(DISTINCT grp."gameProfileId") = COUNT(DISTINCT stm."gameProfileId")
                 AND COUNT(DISTINCT stm."gameProfileId") > 0
            THEN MAX(st.id)
            ELSE NULL
          END as "seasonTeamId",
          CASE
            WHEN COUNT(DISTINCT grp."gameProfileId") = COUNT(DISTINCT stm."gameProfileId")
                 AND COUNT(DISTINCT stm."gameProfileId") > 0
            THEN MAX(st.name)
            ELSE NULL
          END as "seasonTeamName"
        FROM game."GameRun" gr
        LEFT JOIN game."GameRunPlayer" grp ON grp."runId" = gr.id
        LEFT JOIN game."SeasonTeamMember" stm
          ON stm."gameProfileId" = grp."gameProfileId"
         AND TO_CHAR(stm."seasonMonth", 'YYYY-MM') = TO_CHAR(gr."completedAt", 'YYYY-MM')
        LEFT JOIN game."SeasonTeam" st
          ON st.id = stm."teamId"
          OR (st.code IS NOT NULL AND UPPER(TRIM(st.code)) = UPPER(TRIM(gr."lobbyCode")))
        ${whereClause}
        GROUP BY gr.id, gr."lobbyName", gr."lobbyCode", gr."totalTimeSec", gr."completedAt"
      ),
      ranked_team_runs AS (
        SELECT
          tr.*,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(
              tr."seasonTeamId",
              NULLIF(UPPER(TRIM(tr."lobbyCode")), ''),
              tr."teamSignature"
            )
            ORDER BY tr."totalTimeSec" ASC, tr."completedAt" ASC
          ) as rn
        FROM team_runs tr
      )
      SELECT
        r."runId",
        COALESCE(r."seasonTeamName", r."lobbyName") as "lobbyName",
        r."totalTimeSec",
        r."completedAt",
        (SELECT COUNT(*)::int FROM game."GameRunPlayer" grp WHERE grp."runId" = r."runId") as "totalPlayers"
      FROM ranked_team_runs r
      WHERE r.rn = 1
      ORDER BY r."totalTimeSec" ASC, r."completedAt" ASC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const rows = await this.execute(dataSql, dataParams);

    return { rows: rows || [], total };
  }

  async getAvailableSeasons(): Promise<{ seasonMonth: string; label: string }[]> {
    const sql = `
      SELECT DISTINCT s."seasonMonth"
      FROM (
        SELECT TO_CHAR(stm."seasonMonth", 'YYYY-MM') as "seasonMonth"
        FROM game."SeasonTeamMember" stm
        WHERE stm."seasonMonth" IS NOT NULL
        UNION
        SELECT TO_CHAR(gr."completedAt", 'YYYY-MM') as "seasonMonth"
        FROM game."GameRun" gr
        JOIN game."SeasonTeam" st ON UPPER(TRIM(gr."lobbyCode")) = UPPER(TRIM(st.code))
        WHERE gr."isCompleted" = true
          AND gr."totalTimeSec" IS NOT NULL
          AND gr."completedAt" IS NOT NULL
      ) s
      WHERE s."seasonMonth" IS NOT NULL
      ORDER BY s."seasonMonth" DESC
    `;
    const rows = await this.execute(sql);
    const monthSet = new Set<string>();

    for (const r of rows || []) {
      if (r?.seasonMonth && /^\d{4}-\d{2}$/.test(r.seasonMonth)) {
        monthSet.add(r.seasonMonth);
      }
    }

    // Fallback to current month if no seasons with players exist yet
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (monthSet.size === 0) {
      monthSet.add(currentMonth);
    }

    const sorted = Array.from(monthSet).sort().reverse();
    return sorted.map((m) => {
      const [year, month] = m.split('-');
      return {
        seasonMonth: m,
        label: `Tháng ${parseInt(month, 10)}/${year}`,
      };
    });
  }
}

