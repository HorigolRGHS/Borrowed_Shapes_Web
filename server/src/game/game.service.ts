import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { okResponse } from '../common/dto/api-response.dto';
import { GameRun } from '../entities/GameRun';
import { GameRunPlayer } from '../entities/GameRunPlayer';
import { GameSession } from '../entities/GameSession';
import { GameSessionPlayer } from '../entities/GameSessionPlayer';
import { GameProfile } from '../entities/GameProfile';
import { Level } from '../entities/Level';
import { GameSessionStatus } from '../entities/GameSessionStatus';
import { SessionResult } from '../entities/SessionResult';
import { EndRunRequestDto, InitGameRunRequestDto, RunIdResponseDto } from './dto/game-run.dto';
import { JoinLobbyRequestDto } from './dto/join-lobby.dto';
import { StartSessionRequestDto, SessionIdResponseDto } from './dto/start-session.dto';
import {
  EndSessionRequestDto,
  EndSessionStatus,
} from './dto/end-session.dto';

@Injectable()
export class GameService {
  constructor(private readonly em: EntityManager) {}

  async initRun(userId: string, dto: InitGameRunRequestDto, path: string) {
    const runId = await this.em.transactional(async (em) => {
      const gameProfile = await this.findGameProfileOrFail(em, userId);
      const lobbyLevel = await em.findOne(Level, { id: 'lobby' });

      if (!lobbyLevel) {
        throw new BadRequestException('game.lobby_level_not_configured');
      }

      const existingRun = await em.findOne(
        GameRun,
        { lobbyId: dto.lobbyId, isCompleted: false },
        { orderBy: { startedAt: 'desc' } },
      );
      if (existingRun) {
        throw new BadRequestException('game.run_already_active');
      }

      // Create a new game run (table: game.GameRun)
      const run = em.create(GameRun, {
        lobbyId: dto.lobbyId,
        totalLevels: dto.totalLevels,
        isCompleted: false,
        startedAt: new Date(),
      });

      // Add host player into the run (table: game.GameRunPlayer)
      em.create(GameRunPlayer, {
        runId: run,
        gameProfileId: gameProfile,
        isHost: true,
      });

      // Create the initial lobby session for this run (table: game.GameSession)
      const lobbySession = em.create(GameSession, {
        runId: run,
        levelId: lobbyLevel,
        status: GameSessionStatus.IN_PROGRESS,
        startedAt: new Date(),
        minPlayers: dto.minPlayers,
        maxPlayers: dto.maxPlayers,
      });

      // Link host player to lobby session (table: game.GameSessionPlayer)
      em.create(GameSessionPlayer, {
        sessionId: lobbySession,
        gameProfileId: gameProfile,
        isAbsent: false,
      });

      await em.flush();
      return run.id;
    });

    return okResponse<RunIdResponseDto>(
      'game.run_initialized',
      { runId },
      path,
    );
  }

  async joinLobby(userId: string, dto: JoinLobbyRequestDto, path: string) {
    const runId = await this.em.transactional(async (em) => {
      const gameProfile = await this.findGameProfileOrFail(em, userId);
      const run = await em.findOne(
        GameRun,
        { lobbyId: dto.lobbyId, isCompleted: false },
        { orderBy: { startedAt: 'desc' } },
      );
      if (!run) {
        throw new NotFoundException('game.run_not_found_for_lobby');
      }

      const existing = await em.findOne(GameRunPlayer, {
        runId: run.id,
        gameProfileId: gameProfile.id,
      });

      const isLocked = await this.isRunLocked(em, run.id);
      if (isLocked && !existing) {
        throw new BadRequestException('game.run_locked');
      }

      if (!existing) {
        // Add joining player into run roster (table: game.GameRunPlayer)
        em.create(GameRunPlayer, {
          runId: run,
          gameProfileId: gameProfile,
          isHost: false,
        });
      }

      const activeSession = await this.findActiveSession(em, run.id);
      const lobbySession = activeSession
        ? undefined
        : await em.findOne(GameSession, { runId: run.id, levelId: 'lobby' });

      const targetSession = activeSession ?? lobbySession;
      if (!targetSession) {
        throw new NotFoundException('game.lobby_session_not_found');
      }

      const sessionPlayer = await em.findOne(GameSessionPlayer, {
        sessionId: targetSession.id,
        gameProfileId: gameProfile.id,
      });

      if (!sessionPlayer) {
        // Add joining player into active/lobby session participants (table: game.GameSessionPlayer)
        em.create(GameSessionPlayer, {
          sessionId: targetSession,
          gameProfileId: gameProfile,
          isAbsent: false,
        });
      } else {
        sessionPlayer.isAbsent = false;
        sessionPlayer.leftAt = undefined;
      }

      await em.flush();

      return run.id;
    });

    return okResponse<RunIdResponseDto>(
      'game.joined_success',
      { runId },
      path,
    );
  }

  async startSession(dto: StartSessionRequestDto, path: string) {
    const sessionId = await this.em.transactional(async (em) => {
      const run = await em.findOne(GameRun, { id: dto.runId });
      if (!run) {
        throw new NotFoundException('game.run_not_found');
      }

      const level = await em.findOne(Level, { id: dto.levelId });
      if (!level) {
        throw new NotFoundException('game.level_not_found');
      }

      let session = await em.findOne(
        GameSession,
        { runId: run.id, levelId: level.id, status: GameSessionStatus.IN_PROGRESS },
      );

      if (!session) {
        const lobbySession = await em.findOne(GameSession, {
          runId: run.id,
          levelId: 'lobby',
        });
        const minPlayers = lobbySession?.minPlayers ?? 2;
        const maxPlayers = lobbySession?.maxPlayers ?? 5;

        // Create a new session when no active session exists for this map (table: game.GameSession)
        session = em.create(GameSession, {
          runId: run,
          levelId: level,
          status: GameSessionStatus.IN_PROGRESS,
          startedAt: new Date(),
          minPlayers,
          maxPlayers,
        });
      }

      const runPlayers = await em.find(GameRunPlayer, { runId: run.id });
      for (const runPlayer of runPlayers) {
        const sessionPlayer = await em.findOne(GameSessionPlayer, {
          sessionId: session,
          gameProfileId: runPlayer.gameProfileId,
        });

        if (!sessionPlayer) {
          // Ensure each run player has a row in this session (table: game.GameSessionPlayer)
          em.create(GameSessionPlayer, {
            sessionId: session,
            gameProfileId: runPlayer.gameProfileId,
            isAbsent: false,
          });
        } else {
          sessionPlayer.isAbsent = false;
          sessionPlayer.leftAt = undefined;
        }
      }

      session.status = GameSessionStatus.IN_PROGRESS;
      session.startedAt = new Date();

      await em.flush();
      return session.id;
    });

    return okResponse<SessionIdResponseDto>(
      'game.session_started',
      { sessionId },
      path,
    );
  }

  async endSession(dto: EndSessionRequestDto, path: string) {
    await this.em.transactional(async (em) => {
      const session = await em.findOne(GameSession, { id: dto.sessionId });
      if (!session) {
        throw new NotFoundException('game.session_not_found');
      }

      const { status, result } = this.mapEndStatus(dto.status);
      session.status = status;
      session.result = result;
      session.endedAt = new Date();
      session.completionTimeSec = Math.max(
        0,
        Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000),
      );

      const isLobbySession = session.levelId.id === 'lobby';

      if (!isLobbySession) {
        const completionTimeSec = session.completionTimeSec ?? 0;
        const sessionPlayers = await em.find(
          GameSessionPlayer,
          { sessionId: session.id },
          { populate: ['gameProfileId'] },
        );

        for (const sessionPlayer of sessionPlayers) {
          const profile = sessionPlayer.gameProfileId as GameProfile;
          profile.totalSessions += 1;
          profile.totalPlayTime += completionTimeSec;

          if (result === SessionResult.WIN) {
            profile.totalWins += 1;
          } else if (result === SessionResult.LOSE) {
            profile.totalLosses += 1;
          } else {
            profile.totalAbandoned += 1;
          }
        }
      }

      await em.flush();
    });

    return okResponse<null>(
      'game.session_ended',
      null,
      path,
    );
  }

  async endRun(dto: EndRunRequestDto, path: string) {
    await this.em.transactional(async (em) => {
      const run = await em.findOne(GameRun, { id: dto.runId });
      if (!run) {
        throw new NotFoundException('game.run_not_found');
      }

      const sessions = await em.find(GameSession, {
        runId: run.id,
        levelId: { $ne: 'lobby' },
      });

      const totalTimeSec = sessions.reduce(
        (sum, s) => sum + (s.completionTimeSec ?? 0),
        0,
      );

      run.isCompleted = true;
      run.completedAt = new Date();
      run.totalTimeSec = totalTimeSec;

      await em.flush();
    });

    return okResponse<null>(
      'game.run_ended',
      null,
      path,
    );
  }

  async leaveLobby(userId: string, lobbyId: string, path: string) {
    await this.em.transactional(async (em) => {
      const gameProfile = await this.findGameProfileOrFail(em, userId);

      const run = await em.findOne(
        GameRun,
        { lobbyId, isCompleted: false },
        { orderBy: { startedAt: 'desc' } },
      );
      if (!run) {
        return;
      }

      const lobbySession = await em.findOne(GameSession, {
        runId: run.id,
        levelId: 'lobby',
      });

      if (!lobbySession) {
        return;
      }

      const sessionPlayer = await em.findOne(GameSessionPlayer, {
        sessionId: lobbySession.id,
        gameProfileId: gameProfile.id,
      });

      if (!sessionPlayer) {
        return;
      }

      sessionPlayer.isAbsent = true;
      sessionPlayer.leftAt = new Date();

      await em.flush();
    });

    return okResponse<null>(
      'game.left_lobby',
      null,
      path,
    );
  }

  private mapEndStatus(status: EndSessionStatus): {
    status: GameSessionStatus;
    result: SessionResult;
  } {
    switch (status) {
      case EndSessionStatus.FINISHED:
        return { status: GameSessionStatus.FINISHED, result: SessionResult.WIN };
      case EndSessionStatus.FAILED:
        return { status: GameSessionStatus.FINISHED, result: SessionResult.LOSE };
      case EndSessionStatus.ABANDONED:
      default:
        return { status: GameSessionStatus.ABANDONED, result: SessionResult.ABANDONED };
    }
  }

  private async findGameProfileOrFail(em: EntityManager, userId: string): Promise<GameProfile> {
    const gameProfile = await em.findOne(GameProfile, { userId });
    if (!gameProfile) {
      throw new NotFoundException('game.profile_not_found');
    }
    return gameProfile;
  }

  private async isRunLocked(em: EntityManager, runId: string): Promise<boolean> {
    const nonLobbySession = await em.findOne(GameSession, {
      runId,
      levelId: { $ne: 'lobby' },
    });
    return Boolean(nonLobbySession);
  }

  private async findActiveSession(em: EntityManager, runId: string): Promise<GameSession | null> {
    return em.findOne(GameSession, {
      runId,
      status: GameSessionStatus.IN_PROGRESS,
    });
  }
}
