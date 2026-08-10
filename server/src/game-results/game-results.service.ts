import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getEffectiveExpiresAt } from '../achievements/achievements.service';
import { GameResultRepository } from './repositories/game-results.repository';
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
import { getProxyAvatarUrl } from '../auth/auth-utils';
import { getProxyMediaUrl } from '../storage/media-utils';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class GameResultService {
  constructor(private readonly gameResultRepository: GameResultRepository) {}

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

    const { rows, total } =
      await this.gameResultRepository.findPaginatedRuns(query);

    const items: GameResultResponseDto[] = [];
    for (const row of rows || []) {
      const players = await this.getRunPlayers(row.id);
      const sessions = await this.getRunSessions(row.id);
      
      let derivedCompletedAt = row.completedAt ?? undefined;
      let derivedIsCompleted = row.isCompleted;
      
      if (!row.isCompleted && !row.completedAt) {
        const lastSession = sessions[sessions.length - 1];
        if (lastSession && (lastSession.status === 'ABANDONED' || lastSession.status === 'FINISHED' || lastSession.endedAt)) {
          derivedCompletedAt = lastSession.endedAt || lastSession.startedAt;
        } else {
          // If no session ended, but it's been more than 12 hours, treat as abandoned
          const startedAtDate = new Date(row.startedAt);
          const hoursElapsed = (new Date().getTime() - startedAtDate.getTime()) / (1000 * 60 * 60);
          if (hoursElapsed > 12) {
            derivedCompletedAt = new Date(startedAtDate.getTime() + 2 * 60 * 60 * 1000); // Fallback to 2 hours after start
          }
        }
      }

      items.push({
        id: row.id,
        lobbyCode: row.lobbyCode ?? undefined,
        lobbyName: row.lobbyName ?? undefined,
        isPrivate: row.isPrivate,
        totalLevels: row.totalLevels,
        totalSessions: row.totalLevels + 1,
        isCompleted: derivedIsCompleted,
        totalTimeSec: row.totalTimeSec ?? undefined,
        startedAt: row.startedAt,
        completedAt: derivedCompletedAt,
        players,
        sessions,
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
    const row = await this.gameResultRepository.findRunById(id);

    if (!row) {
      throw new NotFoundException('game_results.not_found');
    }

    const players = await this.getRunPlayers(id);
    const sessions = await this.getRunSessions(id);

    let derivedCompletedAt = row.completedAt ?? undefined;
    let derivedIsCompleted = row.isCompleted;
    
    if (!row.isCompleted && !row.completedAt) {
      const lastSession = sessions[sessions.length - 1];
      if (lastSession && (lastSession.status === 'ABANDONED' || lastSession.status === 'FINISHED' || lastSession.endedAt)) {
        derivedCompletedAt = lastSession.endedAt || lastSession.startedAt;
      } else {
        const startedAtDate = new Date(row.startedAt);
        const hoursElapsed = (new Date().getTime() - startedAtDate.getTime()) / (1000 * 60 * 60);
        if (hoursElapsed > 12) {
          derivedCompletedAt = new Date(startedAtDate.getTime() + 2 * 60 * 60 * 1000);
        }
      }
    }

    return {
      id: row.id,
      lobbyCode: row.lobbyCode ?? undefined,
      lobbyName: row.lobbyName ?? undefined,
      isPrivate: row.isPrivate,
      totalLevels: row.totalLevels,
      totalSessions: row.totalLevels + 1,
      isCompleted: derivedIsCompleted,
      totalTimeSec: row.totalTimeSec ?? undefined,
      startedAt: row.startedAt,
      completedAt: derivedCompletedAt,
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

    const profile =
      await this.gameResultRepository.findPlayerProfile(gameProfileId);

    if (!profile) {
      throw new NotFoundException('game_results.player_not_found');
    }

    let badgeImageUrl = undefined;
    if (profile.badgeImageUrl) {
      const expiresAt = getEffectiveExpiresAt(
        profile.badgeType,
        profile.badgeSeasonMonth,
        profile.badgeExpiresAt,
      );
      if (
        profile.badgeType !== 'SEASONAL' ||
        (expiresAt && expiresAt >= new Date())
      ) {
        badgeImageUrl = getProxyMediaUrl(profile.badgeImageUrl);
      }
    }

    const playerInfo: PlayerInfoDto = {
      gameProfileId: profile.gameProfileId,
      displayName: (profile.displayName as string) ?? '',
      avatarUrl: getProxyAvatarUrl(profile.avatarUrl, profile.userId, profile.updatedAt) ?? undefined,
      badgeImageUrl: badgeImageUrl ?? undefined,
    };

    const playerStats: PlayerStatsDto = {
      totalSessions: profile.totalSessions ?? 0,
      totalWins: profile.totalWins ?? 0,
      totalLosses: profile.totalLosses ?? 0,
      totalAbandoned: profile.totalAbandoned ?? 0,
      totalPlayTimeSec: profile.totalPlayTime ?? 0,
    };

    const total =
      await this.gameResultRepository.countPlayerRuns(gameProfileId);
    const rows = await this.gameResultRepository.findRunHistoryForPlayer(
      gameProfileId,
      query,
    );

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

    const { rows, total } =
      await this.gameResultRepository.getLeaderboardData(query);

    const items: LeaderboardEntryDto[] = [];
    for (let index = 0; index < (rows || []).length; index++) {
      const row = rows[index];
      const runPlayers = await this.getRunPlayers(row.runId);
      items.push({
        rank: offset + index + 1,
        runId: row.runId,
        lobbyName: row.lobbyName ?? undefined,
        totalPlayers: row.totalPlayers,
        totalTimeSec: row.totalTimeSec,
        completedAt: row.completedAt,
        players: runPlayers.map((p) => ({
          gameProfileId: p.gameProfileId,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          badgeImageUrl: p.badgeImageUrl,
        })),
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

  async getAvailableSeasons(): Promise<{ seasonMonth: string; label: string }[]> {
    return this.gameResultRepository.getAvailableSeasons();
  }

  async delete(id: string): Promise<void> {
    const run = await this.gameResultRepository.findOne(id);
    if (!run) {
      throw new NotFoundException('game_results.not_found');
    }

    const sessions = await this.getRunSessions(id);
    let derivedCompletedAt = run.completedAt ?? undefined;

    if (!run.isCompleted && !run.completedAt) {
      const lastSession = sessions[sessions.length - 1];
      if (
        lastSession &&
        (lastSession.status === 'ABANDONED' ||
          lastSession.status === 'FINISHED' ||
          lastSession.endedAt)
      ) {
        derivedCompletedAt = lastSession.endedAt || lastSession.startedAt;
      } else {
        const startedAtDate = new Date(run.startedAt);
        const hoursElapsed =
          (new Date().getTime() - startedAtDate.getTime()) / (1000 * 60 * 60);
        if (hoursElapsed > 12) {
          derivedCompletedAt = new Date(
            startedAtDate.getTime() + 2 * 60 * 60 * 1000,
          );
        }
      }
    }

    if (!run.isCompleted && !derivedCompletedAt) {
      throw new BadRequestException('game_results.cannot_delete_in_progress');
    }

    await this.gameResultRepository.removeAndFlush(run);
  }

  private async getRunPlayers(runId: string): Promise<GameResultPlayerDto[]> {
    const rows = await this.gameResultRepository.getRunPlayers(runId);

    return (rows || []).map((row: any) => {
      let badgeImageUrl = undefined;
      if (row.badgeImageUrl) {
        const expiresAt = getEffectiveExpiresAt(
          row.badgeType,
          row.badgeSeasonMonth,
          row.badgeExpiresAt,
        );
        if (
          row.badgeType !== 'SEASONAL' ||
          (expiresAt && expiresAt >= new Date())
        ) {
          badgeImageUrl = getProxyMediaUrl(row.badgeImageUrl);
        }
      }
      return {
        gameProfileId: row.gameProfileId,
        displayName: (row.displayName as string) ?? '',
        avatarUrl: getProxyAvatarUrl(row.avatarUrl, row.userId, row.updatedAt) ?? undefined,
        isHost: row.isHost,
        joinedAt: row.joinedAt,
        badgeImageUrl: badgeImageUrl ?? undefined,
      };
    });
  }

  private async getRunSessions(runId: string): Promise<GameResultSessionDto[]> {
    const sessionRows = await this.gameResultRepository.getRunSessions(runId);

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
    const rows = await this.gameResultRepository.getSessionPlayers(sessionId);

    return (rows || []).map((row: any) => {
      let badgeImageUrl = undefined;
      if (row.badgeImageUrl) {
        const expiresAt = getEffectiveExpiresAt(
          row.badgeType,
          row.badgeSeasonMonth,
          row.badgeExpiresAt,
        );
        if (
          row.badgeType !== 'SEASONAL' ||
          (expiresAt && expiresAt >= new Date())
        ) {
          badgeImageUrl = getProxyMediaUrl(row.badgeImageUrl);
        }
      }
      return {
        gameProfileId: row.gameProfileId,
        displayName: (row.displayName as string) ?? '',
        avatarUrl: getProxyAvatarUrl(row.avatarUrl, row.userId, row.updatedAt) ?? undefined,
        isAbsent: row.isAbsent,
        leftAt: row.leftAt ?? undefined,
        badgeImageUrl: badgeImageUrl ?? undefined,
      };
    });
  }
}
