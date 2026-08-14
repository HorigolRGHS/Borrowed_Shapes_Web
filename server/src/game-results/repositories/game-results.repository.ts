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
      LEFT JOIN game."SeasonTeamMember" stm ON stm."gameProfileId" = grp."gameProfileId" AND date_trunc('month', stm."seasonMonth") = date_trunc('month', grp."joinedAt")
      LEFT JOIN game."SeasonTeam" st ON st.id = stm."teamId"
      WHERE grp."runId" = ?
      ORDER BY 
        CASE WHEN st."leaderId" = grp."gameProfileId" THEN 0 ELSE 1 END ASC,
        grp."joinedAt" ASC
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

    const isSeasonal = query.scope === 'seasonal';

    if (isSeasonal) {
      let month = query.seasonMonth;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        month = new Date().toISOString().slice(0, 7);
      }
      const targetMonthDate = `${month}-01`;

      const countSql = `
        WITH run_members AS (
          SELECT
            r."id"           AS run_id,
            r."totalTimeSec" AS total_time,
            r."completedAt"  AS completed_at,
            r."lobbyName"    AS lobby_name,
            array_agg(p."gameProfileId" ORDER BY p."gameProfileId") AS member_set
          FROM game."GameRun" r
          JOIN game."GameRunPlayer" p ON p."runId" = r."id"
          WHERE r."isCompleted" = true
            AND r."totalTimeSec" IS NOT NULL
            AND date_trunc('month', r."completedAt") = date_trunc('month', ?::date)
          GROUP BY r."id", r."totalTimeSec", r."completedAt", r."lobbyName"
        ),
        team_members AS (
          SELECT
            st."id"   AS team_id,
            st."name" AS team_name,
            array_agg(stm."gameProfileId" ORDER BY stm."gameProfileId") AS member_set
          FROM game."SeasonTeam" st
          JOIN game."SeasonTeamMember" stm
            ON stm."teamId" = st."id" AND date_trunc('month', stm."seasonMonth") = date_trunc('month', st."seasonMonth")
          WHERE date_trunc('month', st."seasonMonth") = date_trunc('month', ?::date)
          GROUP BY st."id", st."name"
        ),
        matched_runs AS (
          SELECT
            tm.team_id,
            rm.run_id,
            rm.total_time,
            rm.completed_at
          FROM run_members rm
          JOIN team_members tm ON rm.member_set <@ tm.member_set
        ),
        best_run_per_team AS (
          SELECT DISTINCT ON (team_id) team_id, total_time, completed_at
          FROM matched_runs
          ORDER BY team_id, total_time ASC, completed_at ASC
        )
        SELECT COUNT(*)::int AS count FROM best_run_per_team
      `;
      const countResult = await this.execute(countSql, [targetMonthDate, targetMonthDate]);
      const total = Number(countResult[0]?.count || 0);

      const dataSql = `
        WITH run_members AS (
          SELECT
            r."id"           AS run_id,
            r."totalTimeSec" AS total_time,
            r."completedAt"  AS completed_at,
            r."lobbyName"    AS lobby_name,
            array_agg(p."gameProfileId" ORDER BY p."gameProfileId") AS member_set
          FROM game."GameRun" r
          JOIN game."GameRunPlayer" p ON p."runId" = r."id"
          WHERE r."isCompleted" = true
            AND r."totalTimeSec" IS NOT NULL
            AND date_trunc('month', r."completedAt") = date_trunc('month', ?::date)
          GROUP BY r."id", r."totalTimeSec", r."completedAt", r."lobbyName"
        ),
        team_members AS (
          SELECT
            st."id"   AS team_id,
            st."name" AS team_name,
            st."leaderId" AS leader_id,
            array_agg(stm."gameProfileId" ORDER BY stm."gameProfileId") AS member_set
          FROM game."SeasonTeam" st
          JOIN game."SeasonTeamMember" stm
            ON stm."teamId" = st."id" AND date_trunc('month', stm."seasonMonth") = date_trunc('month', st."seasonMonth")
          WHERE date_trunc('month', st."seasonMonth") = date_trunc('month', ?::date)
          GROUP BY st."id", st."name", st."leaderId"
        ),
        matched_runs AS (
          SELECT
            tm.team_id,
            tm.team_name,
            tm.leader_id,
            rm.run_id,
            rm.total_time,
            rm.completed_at,
            rm.lobby_name
          FROM run_members rm
          JOIN team_members tm ON rm.member_set <@ tm.member_set
        ),
        best_run_per_team AS (
          SELECT DISTINCT ON (team_id)
            team_id,
            team_name,
            leader_id,
            run_id,
            total_time,
            completed_at,
            lobby_name
          FROM matched_runs
          ORDER BY team_id, total_time ASC, completed_at ASC
        )
        SELECT
          b.run_id AS "runId",
          COALESCE(NULLIF(TRIM(b.team_name), ''), b.lobby_name) AS "lobbyName",
          b.total_time AS "totalTimeSec",
          b.completed_at AS "completedAt",
          b.leader_id AS "leaderId",
          (SELECT COUNT(*)::int FROM game."GameRunPlayer" grp WHERE grp."runId" = b.run_id) AS "totalPlayers"
        FROM best_run_per_team b
        ORDER BY b.total_time ASC, b.completed_at ASC
        LIMIT ? OFFSET ?
      `;
      const dataParams = [targetMonthDate, targetMonthDate, limit, offset];
      const rows = await this.execute(dataSql, dataParams);

      return { rows: rows || [], total };
    } else {
      const countSql = `
        WITH run_members AS (
          SELECT
            r."id"           AS run_id,
            r."totalTimeSec" AS total_time,
            r."completedAt"  AS completed_at,
            r."lobbyName"    AS lobby_name,
            array_agg(p."gameProfileId" ORDER BY p."gameProfileId") AS member_set
          FROM game."GameRun" r
          JOIN game."GameRunPlayer" p ON p."runId" = r."id"
          WHERE r."isCompleted" = true
            AND r."totalTimeSec" IS NOT NULL
          GROUP BY r."id", r."totalTimeSec", r."completedAt", r."lobbyName"
        ),
        team_members AS (
          SELECT
            st."id"   AS team_id,
            st."name" AS team_name,
            st."seasonMonth" AS season_month,
            array_agg(stm."gameProfileId" ORDER BY stm."gameProfileId") AS member_set
          FROM game."SeasonTeam" st
          JOIN game."SeasonTeamMember" stm
            ON stm."teamId" = st."id" AND date_trunc('month', stm."seasonMonth") = date_trunc('month', st."seasonMonth")
          GROUP BY st."id", st."name", st."seasonMonth"
        ),
        matched_runs AS (
          SELECT
            COALESCE(
              'TEAM:' || tm.team_id,
              'RUN_SET:' || array_to_string(rm.member_set, ',')
            ) AS team_key,
            tm.team_name,
            rm.run_id,
            rm.total_time,
            rm.completed_at,
            rm.lobby_name
          FROM run_members rm
          LEFT JOIN team_members tm
            ON date_trunc('month', rm.completed_at) = date_trunc('month', tm.season_month)
           AND rm.member_set <@ tm.member_set
        ),
        best_run_per_team AS (
          SELECT DISTINCT ON (team_key)
            team_key, total_time, completed_at
          FROM matched_runs
          ORDER BY team_key, total_time ASC, completed_at ASC
        )
        SELECT COUNT(*)::int AS count FROM best_run_per_team
      `;
      const countResult = await this.execute(countSql);
      const total = Number(countResult[0]?.count || 0);

      const dataSql = `
        WITH run_members AS (
          SELECT
            r."id"           AS run_id,
            r."totalTimeSec" AS total_time,
            r."completedAt"  AS completed_at,
            r."lobbyName"    AS lobby_name,
            array_agg(p."gameProfileId" ORDER BY p."gameProfileId") AS member_set
          FROM game."GameRun" r
          JOIN game."GameRunPlayer" p ON p."runId" = r."id"
          WHERE r."isCompleted" = true
            AND r."totalTimeSec" IS NOT NULL
          GROUP BY r."id", r."totalTimeSec", r."completedAt", r."lobbyName"
        ),
        team_members AS (
          SELECT
            st."id"   AS team_id,
            st."name" AS team_name,
            st."seasonMonth" AS season_month,
            array_agg(stm."gameProfileId" ORDER BY stm."gameProfileId") AS member_set
          FROM game."SeasonTeam" st
          JOIN game."SeasonTeamMember" stm
            ON stm."teamId" = st."id" AND date_trunc('month', stm."seasonMonth") = date_trunc('month', st."seasonMonth")
          GROUP BY st."id", st."name", st."seasonMonth"
        ),
        matched_runs AS (
          SELECT
            COALESCE(
              'TEAM:' || tm.team_id,
              'RUN_SET:' || array_to_string(rm.member_set, ',')
            ) AS team_key,
            tm.team_name,
            rm.run_id,
            rm.total_time,
            rm.completed_at,
            rm.lobby_name
          FROM run_members rm
          LEFT JOIN team_members tm
            ON date_trunc('month', rm.completed_at) = date_trunc('month', tm.season_month)
           AND rm.member_set <@ tm.member_set
        ),
        best_run_per_team AS (
          SELECT DISTINCT ON (team_key)
            team_key,
            team_name,
            run_id,
            total_time,
            completed_at,
            lobby_name
          FROM matched_runs
          ORDER BY team_key, total_time ASC, completed_at ASC
        )
        SELECT
          b.run_id AS "runId",
          COALESCE(NULLIF(TRIM(b.team_name), ''), b.lobby_name) AS "lobbyName",
          b.total_time AS "totalTimeSec",
          b.completed_at AS "completedAt",
          (SELECT COUNT(*)::int FROM game."GameRunPlayer" grp WHERE grp."runId" = b.run_id) AS "totalPlayers"
        FROM best_run_per_team b
        ORDER BY b.total_time ASC, b.completed_at ASC
        LIMIT ? OFFSET ?
      `;
      const dataParams = [limit, offset];
      const rows = await this.execute(dataSql, dataParams);

      return { rows: rows || [], total };
    }
  }

  async getAvailableSeasons(): Promise<{ seasonMonth: string; label: string }[]> {
    const sql = `
      SELECT DISTINCT s."seasonMonth"
      FROM (
        SELECT TO_CHAR(st."seasonMonth", 'YYYY-MM') as "seasonMonth"
        FROM game."SeasonTeam" st
        WHERE st."seasonMonth" IS NOT NULL
        UNION
        SELECT TO_CHAR(gr."completedAt", 'YYYY-MM') as "seasonMonth"
        FROM game."GameRun" gr
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

