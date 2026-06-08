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

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countSql = `SELECT COUNT(*) as count FROM game."GameRun" gr ${whereClause}`;
    const countResult = await this.em.execute(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    // Sort
    const sortBy = query.sortBy ?? 'startedAt';
    const order = query.order ?? 'desc';
    const sortColumn = {
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
      isCompleted: row.isCompleted,
      totalTimeSec: row.totalTimeSec ?? undefined,
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
      players,
      sessions,
    };
  }

  async findByUser(
    gameProfileId: string,
    query: ListGameResultsQueryDto,
  ): Promise<GameResultListResponseDto> {
    const overridden = { ...query, gameProfileId };
    return this.findAllPaginated(overridden);
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

    // Leaderboard: fastest completed runs
    const dataSql = `
      SELECT
        gr.id as "runId",
        gr."totalTimeSec",
        gr."completedAt",
        grp."gameProfileId",
        u."displayName",
        u."imgUrl" as "avatarUrl"
      FROM game."GameRun" gr
      INNER JOIN game."GameRunPlayer" grp ON grp."runId" = gr.id AND grp."isHost" = true
      INNER JOIN game."GameProfile" gp ON gp.id = grp."gameProfileId"
      INNER JOIN auth."User" u ON u.id = gp."userId"
      WHERE gr."isCompleted" = true AND gr."totalTimeSec" IS NOT NULL
      ORDER BY gr."totalTimeSec" ASC, gr."completedAt" ASC
      LIMIT ? OFFSET ?
    `;
    const rows = await this.em.execute(dataSql, [limit, offset]);

    const items: LeaderboardEntryDto[] = (rows || []).map(
      (row: any, index: number) => ({
        rank: offset + index + 1,
        gameProfileId: row.gameProfileId,
        displayName: (row.displayName as string) ?? '',
        avatarUrl: row.avatarUrl ?? undefined,
        totalTimeSec: row.totalTimeSec,
        completedAt: row.completedAt,
        runId: row.runId,
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

  private async getRunSessions(
    runId: string,
  ): Promise<GameResultSessionDto[]> {
    const sessionSql = `
      SELECT
        gs.id,
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
