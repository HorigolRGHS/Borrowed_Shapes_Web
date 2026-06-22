import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { GameRun } from '../entities/GameRun';
import {
  ListGameResultsQueryDto,
  LeaderboardQueryDto,
  GameResultResponseDto,
  GameResultDetailResponseDto,
  GameResultListResponseDto,
  GameResultPlayerDto,
  GameResultSessionDto,
  GameResultSessionPlayerDto,
  LeaderboardEntryDto,
  LeaderboardResponseDto,
  PlayerHistoryResponseDto,
  PlayerHistoryRunDto,
  PlayerInfoDto,
  PlayerStatsDto,
} from './dto/game-results-response.dto';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class GameResultService {
  constructor(private readonly em: EntityManager) {}

  async findAllPaginated(
    query: ListGameResultsQueryDto,
  ): Promise<GameResultListResponseDto> {
    // Normalize q to search
    if (query.q && !query.search) {
      query.search = query.q;
    }
    // Normalize sort to sortBy and order
    if (query.sort) {
      if (query.sort === 'newest') {
        query.sortBy = 'startedAt';
        query.order = 'desc';
      } else if (query.sort === 'oldest') {
        query.sortBy = 'startedAt';
        query.order = 'asc';
      } else if (query.sort === 'fastest') {
        query.sortBy = 'totalTimeSec';
        query.order = 'asc';
      }
    }

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

    // Count
    const countSql = `SELECT COUNT(*) as count FROM game."GameRun" gr ${whereClause}`;
    const countResult = await this.em.execute(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    // Sort
    const sortBy = query.sortBy ?? 'startedAt';
    const order = query.order ?? 'desc';
    const sortColumn =
      {
        startedAt: '"startedAt"',
        completedAt: '"completedAt"',
        totalTimeSec: '"totalTimeSec"',
      }[sortBy] ?? '"startedAt"';

    // Data
    const dataSql = `
      SELECT gr.*
      FROM game."GameRun" gr
      ${whereClause}
      ORDER BY gr.${sortColumn} ${order}, gr.id DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const rows = await this.em.execute(dataSql, dataParams);

    const items: GameResultResponseDto[] = [];
    for (const row of rows || []) {
      const players = await this.getRunPlayers(row.id);
      items.push({
        id: row.id,
        lobbyCode: row.lobbyCode ?? undefined,
        lobbyName: row.lobbyName ?? undefined,
        isPrivate: row.isPrivate,
        totalLevels: row.totalLevels,
        totalSessions: row.totalLevels + 1,
        isCompleted: row.isCompleted,
        totalTimeSec: row.totalTimeSec ?? undefined,
        startedAt: row.startedAt,
        completedAt: row.completedAt ?? undefined,
        players,
      });
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string): Promise<GameResultDetailResponseDto> {
    const runSql = `SELECT * FROM game."GameRun" gr WHERE gr.id = ?`;
    const runRows = await this.em.execute(runSql, [id]);

    if (!runRows || runRows.length === 0) {
      throw new NotFoundException('game_results.not_found');
    }

    const row = runRows[0];
    const players = await this.getRunPlayers(id);
    const sessions = await this.getRunSessions(id);

    return {
      id: row.id,
      lobbyCode: row.lobbyCode ?? undefined,
      lobbyName: row.lobbyName ?? undefined,
      isPrivate: row.isPrivate,
      totalLevels: row.totalLevels,
      totalSessions: row.totalLevels + 1,
      isCompleted: row.isCompleted,
      totalTimeSec: row.totalTimeSec ?? undefined,
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
      players,
      sessions,
    };
  }

  async findPlayerHistory(
    gameProfileId: string,
    query: ListGameResultsQueryDto,
  ): Promise<PlayerHistoryResponseDto> {
    // Normalize q to search
    if (query.q && !query.search) {
      query.search = query.q;
    }
    // Normalize sort to sortBy and order
    if (query.sort) {
      if (query.sort === 'newest') {
        query.sortBy = 'startedAt';
        query.order = 'desc';
      } else if (query.sort === 'oldest') {
        query.sortBy = 'startedAt';
        query.order = 'asc';
      } else if (query.sort === 'fastest') {
        query.sortBy = 'totalTimeSec';
        query.order = 'asc';
      }
    }

    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? 10, 1, 50);
    const offset = (page - 1) * limit;

    // Player info + stats from GameProfile
    const profileSql = `
      SELECT
        gp.id as "gameProfileId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        gp."totalSessions",
        gp."totalWins",
        gp."totalLosses",
        gp."totalAbandoned",
        gp."totalPlayTime"
      FROM game."GameProfile" gp
      INNER JOIN auth."User" u ON u.id = gp."userId"
      WHERE gp.id = ?
    `;
    const profileRows = await this.em.execute(profileSql, [gameProfileId]);

    if (!profileRows || profileRows.length === 0) {
      throw new NotFoundException('game_results.player_not_found');
    }

    const profile = profileRows[0];

    const playerInfo: PlayerInfoDto = {
      gameProfileId: profile.gameProfileId,
      displayName: (profile.displayName as string) ?? '',
      avatarUrl: profile.avatarUrl ?? undefined,
    };

    const playerStats: PlayerStatsDto = {
      totalSessions: profile.totalSessions ?? 0,
      totalWins: profile.totalWins ?? 0,
      totalLosses: profile.totalLosses ?? 0,
      totalAbandoned: profile.totalAbandoned ?? 0,
      totalPlayTimeSec: profile.totalPlayTime ?? 0,
    };

    // Count runs for this player
    const countSql = `
      SELECT COUNT(*) as count
      FROM game."GameRunPlayer" grp
      WHERE grp."gameProfileId" = ?
    `;
    const countResult = await this.em.execute(countSql, [gameProfileId]);
    const total = Number(countResult[0]?.count || 0);

    // Sort
    const sortBy = query.sortBy ?? 'startedAt';
    const order = query.order ?? 'desc';
    const sortColumn =
      {
        startedAt: 'gr."startedAt"',
        completedAt: 'gr."completedAt"',
        totalTimeSec: 'gr."totalTimeSec"',
      }[sortBy] ?? 'gr."startedAt"';

    // Runs with player role
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
    const rows = await this.em.execute(dataSql, [gameProfileId, limit, offset]);

    const items: PlayerHistoryRunDto[] = [];
    for (const row of rows || []) {
      const players = await this.getRunPlayers(row.id);
      items.push({
        id: row.id,
        lobbyCode: row.lobbyCode ?? undefined,
        lobbyName: row.lobbyName ?? undefined,
        isPrivate: row.isPrivate,
        totalLevels: row.totalLevels,
        totalSessions: row.totalLevels + 1,
        isCompleted: row.isCompleted,
        totalTimeSec: row.totalTimeSec ?? undefined,
        startedAt: row.startedAt,
        completedAt: row.completedAt ?? undefined,
        players,
        playerRole: row.isHost ? 'HOST' : 'PLAYER',
      });
    }

    return {
      playerInfo,
      playerStats,
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getLeaderboard(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? 10, 1, 50);
    const offset = (page - 1) * limit;

    // Count total completed runs
    const countSql = `
      SELECT COUNT(*) as count
      FROM game."GameRun" gr
      WHERE gr."isCompleted" = true AND gr."totalTimeSec" IS NOT NULL
    `;
    const countResult = await this.em.execute(countSql);
    const total = Number(countResult[0]?.count || 0);

    // Leaderboard: fastest completed runs with lobby name and player count
    const dataSql = `
      SELECT
        gr.id as "runId",
        gr."lobbyName",
        gr."totalTimeSec",
        gr."completedAt",
        (SELECT COUNT(*)::int FROM game."GameRunPlayer" grp WHERE grp."runId" = gr.id) as "totalPlayers"
      FROM game."GameRun" gr
      WHERE gr."isCompleted" = true AND gr."totalTimeSec" IS NOT NULL
      ORDER BY gr."totalTimeSec" ASC, gr."completedAt" ASC
      LIMIT ? OFFSET ?
    `;
    const rows = await this.em.execute(dataSql, [limit, offset]);

    const items: LeaderboardEntryDto[] = (rows || []).map(
      (row: any, index: number) => ({
        rank: offset + index + 1,
        runId: row.runId,
        lobbyName: row.lobbyName ?? undefined,
        totalPlayers: row.totalPlayers,
        totalTimeSec: row.totalTimeSec,
        completedAt: row.completedAt,
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async delete(id: string): Promise<void> {
    const run = await this.em.findOne(GameRun, { id });
    if (!run) {
      throw new NotFoundException('game_results.not_found');
    }
    await this.em.removeAndFlush(run);
  }

  private async getRunPlayers(runId: string): Promise<GameResultPlayerDto[]> {
    const sql = `
      SELECT
        grp."gameProfileId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        grp."isHost",
        grp."joinedAt"
      FROM game."GameRunPlayer" grp
      INNER JOIN game."GameProfile" gp ON gp.id = grp."gameProfileId"
      INNER JOIN auth."User" u ON u.id = gp."userId"
      WHERE grp."runId" = ?
      ORDER BY grp."joinedAt" ASC
    `;
    const rows = await this.em.execute(sql, [runId]);

    return (rows || []).map((row: any) => ({
      gameProfileId: row.gameProfileId,
      displayName: (row.displayName as string) ?? '',
      avatarUrl: row.avatarUrl ?? undefined,
      isHost: row.isHost,
      joinedAt: row.joinedAt,
    }));
  }

  private async getRunSessions(runId: string): Promise<GameResultSessionDto[]> {
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
    const sessionRows = await this.em.execute(sessionSql, [runId]);

    const sessions: GameResultSessionDto[] = [];
    for (const sRow of sessionRows || []) {
      const players = await this.getSessionPlayers(sRow.id);
      sessions.push({
        id: sRow.id,
        levelId: sRow.levelId,
        levelName: sRow.levelName,
        levelOrder: sRow.levelOrder,
        status: sRow.status,
        result: sRow.result ?? undefined,
        completionTimeSec: sRow.completionTimeSec ?? undefined,
        startedAt: sRow.startedAt,
        endedAt: sRow.endedAt ?? undefined,
        players,
      });
    }

    return sessions;
  }

  private async getSessionPlayers(
    sessionId: string,
  ): Promise<GameResultSessionPlayerDto[]> {
    const sql = `
      SELECT
        gsp."gameProfileId",
        u."displayName",
        u."imgUrl" as "avatarUrl",
        gsp."isAbsent",
        gsp."leftAt"
      FROM game."GameSessionPlayer" gsp
      INNER JOIN game."GameProfile" gp ON gp.id = gsp."gameProfileId"
      INNER JOIN auth."User" u ON u.id = gp."userId"
      WHERE gsp."sessionId" = ?
      ORDER BY gsp."gameProfileId" ASC
    `;
    const rows = await this.em.execute(sql, [sessionId]);

    return (rows || []).map((row: any) => ({
      gameProfileId: row.gameProfileId,
      displayName: (row.displayName as string) ?? '',
      avatarUrl: row.avatarUrl ?? undefined,
      isAbsent: row.isAbsent,
      leftAt: row.leftAt ?? undefined,
    }));
  }
}
