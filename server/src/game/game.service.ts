import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
import {
  EndRunRequestDto,
  InitGameRunRequestDto,
  RunIdResponseDto,
} from './dto/game-run.dto';
import { JoinLobbyRequestDto } from './dto/join-lobby.dto';
import {
  StartSessionRequestDto,
  SessionIdResponseDto,
} from './dto/start-session.dto';
import { EndSessionRequestDto, EndSessionStatus } from './dto/end-session.dto';

import { GameProfileRepository } from './repositories/game-profile.repository';
import { GameRunRepository } from './repositories/game-run.repository';
import { GameSessionRepository } from './repositories/game-session.repository';
import { GameRunPlayerRepository } from './repositories/game-run-player.repository';
import { GameSessionPlayerRepository } from './repositories/game-session-player.repository';
import { LevelRepository } from './repositories/level.repository';

@Injectable()
export class GameService {
  constructor(
    private readonly em: EntityManager,
    private readonly gameProfileRepo: GameProfileRepository,
    private readonly gameRunRepo: GameRunRepository,
    private readonly gameSessionRepo: GameSessionRepository,
    private readonly gameRunPlayerRepo: GameRunPlayerRepository,
    private readonly gameSessionPlayerRepo: GameSessionPlayerRepository,
    private readonly levelRepository: LevelRepository,
  ) {}

  async initRun(userId: string, dto: InitGameRunRequestDto, path: string) {
    const runId = await this.em.transactional(async (em) => {
      const gameProfile = await this.gameProfileRepo.findGameProfileOrFail(
        em,
        userId,
      );
      const lobbyLevel = await this.levelRepository.txFindOne(em, {
        id: 'lobby',
      });

      if (!lobbyLevel) {
        throw new BadRequestException('game.lobby_level_not_configured');
      }

      const existingRun = await this.gameRunRepo.findActiveLobbyRun(
        em,
        dto.lobbyId,
      );
      if (existingRun) {
        throw new BadRequestException('game.run_already_active');
      }

      // Create a new game run (table: game.GameRun)
      const run = this.gameRunRepo.txCreate(em, {
        lobbyId: dto.lobbyId,
        lobbyCode: dto.lobbyCode,
        lobbyName: dto.lobbyName,
        totalLevels: dto.totalLevels,
        isCompleted: false,
        startedAt: new Date(),
      });

      // Add host player into the run (table: game.GameRunPlayer)
      this.gameRunPlayerRepo.txCreate(em, {
        runId: run,
        gameProfileId: gameProfile,
        isHost: true,
      });

      // Create the initial lobby session for this run (table: game.GameSession)
      const lobbySession = this.gameSessionRepo.txCreate(em, {
        runId: run,
        levelId: lobbyLevel,
        status: GameSessionStatus.IN_PROGRESS,
        startedAt: new Date(),
        minPlayers: dto.minPlayers,
        maxPlayers: dto.maxPlayers,
      });

      // Link host player to lobby session (table: game.GameSessionPlayer)
      this.gameSessionPlayerRepo.txCreate(em, {
        sessionId: lobbySession,
        gameProfileId: gameProfile,
        isAbsent: false,
      });

      await this.gameSessionRepo.txFlush(em);
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
      const gameProfile = await this.gameProfileRepo.findGameProfileOrFail(
        em,
        userId,
      );
      const run = await this.gameRunRepo.findActiveLobbyRun(em, dto.lobbyId);
      if (!run) {
        throw new NotFoundException('game.run_not_found_for_lobby');
      }

      const existing = await this.gameRunPlayerRepo.txFindOne(em, {
        runId: run.id,
        gameProfileId: gameProfile.id,
      });

      const isLocked = await this.gameSessionRepo.isRunLocked(em, run.id);
      if (isLocked && !existing) {
        throw new BadRequestException('game.run_locked');
      }

      // Do NOT create GameRunPlayer here. It will be created in startSession when leaving the lobby.

      const activeSession = await this.gameSessionRepo.findActiveSession(
        em,
        run.id,
      );
      const lobbySession = activeSession
        ? undefined
        : await this.gameSessionRepo.txFindOne(em, {
            runId: run.id,
            levelId: 'lobby',
          });

      const targetSession = activeSession ?? lobbySession;
      if (!targetSession) {
        throw new NotFoundException('game.lobby_session_not_found');
      }

      const sessionPlayer = await this.gameSessionPlayerRepo.txFindOne(em, {
        sessionId: targetSession.id,
        gameProfileId: gameProfile.id,
      });

      if (!sessionPlayer) {
        // Add joining player into active/lobby session participants (table: game.GameSessionPlayer)
        this.gameSessionPlayerRepo.txCreate(em, {
          sessionId: targetSession,
          gameProfileId: gameProfile,
          isAbsent: false,
        });
      } else {
        sessionPlayer.isAbsent = false;
        sessionPlayer.leftAt = undefined;
      }

      await this.gameSessionRepo.txFlush(em);

      return run.id;
    });

    return okResponse<RunIdResponseDto>('game.joined_success', { runId }, path);
  }

  async startSession(dto: StartSessionRequestDto, path: string) {
    const sessionId = await this.em.transactional(async (em) => {
      const run = await this.gameRunRepo.txFindOne(em, { id: dto.runId });
      if (!run) {
        throw new NotFoundException('game.run_not_found');
      }

      const level = await this.levelRepository.txFindOne(em, {
        id: dto.levelId,
      });
      if (!level) {
        throw new NotFoundException('game.level_not_found');
      }

      // Check if this is the first non-lobby map BEFORE we create the new session
      const isFirstMap = level.id !== 'lobby' && !(await this.gameSessionRepo.isRunLocked(em, run.id));

      let session = await this.gameSessionRepo.txFindOne(em, {
        runId: run.id,
        levelId: level.id,
        status: GameSessionStatus.IN_PROGRESS,
      });

      if (!session) {
        // Before creating a new session, ensure any previous IN_PROGRESS sessions (e.g. Lobby) are closed
        await em.getConnection().execute(
          `UPDATE game."GameSession"
           SET status = 'FINISHED', "endedAt" = NOW(),
               "completionTimeSec" = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - "startedAt"))::int)
           WHERE "runId" = ? AND status = 'IN_PROGRESS'`,
          [run.id],
        );

        const lobbySession = await this.gameSessionRepo.txFindOne(em, {
          runId: run.id,
          levelId: 'lobby',
        });
        const minPlayers = lobbySession?.minPlayers ?? 2;
        const maxPlayers = lobbySession?.maxPlayers ?? 5;

        // Create a new session when no active session exists for this map (table: game.GameSession)
        session = this.gameSessionRepo.txCreate(em, {
          runId: run,
          levelId: level,
          status: GameSessionStatus.IN_PROGRESS,
          startedAt: new Date(),
          minPlayers,
          maxPlayers,
        });
      }

      // If leaving lobby for the first time, lock in the roster by saving active players to GameRunPlayer
      if (isFirstMap) {
        const lobbySession = await this.gameSessionRepo.txFindOne(em, {
          runId: run.id,
          levelId: 'lobby',
        });
        if (lobbySession) {
          const lobbyPlayers = await this.gameSessionPlayerRepo.txFind(em, {
            sessionId: lobbySession.id,
            isAbsent: false,
          });
          for (const lp of lobbyPlayers) {
            const exists = await this.gameRunPlayerRepo.txFindOne(em, {
              runId: run.id,
              gameProfileId: lp.gameProfileId,
            });
            if (!exists) {
              this.gameRunPlayerRepo.txCreate(em, {
                runId: run,
                gameProfileId: lp.gameProfileId,
                isHost: false, // The host was already added in initRun and will be caught by `exists`
              });
            }
          }
        }
      }

      const runPlayers = await this.gameRunPlayerRepo.txFind(em, {
        runId: run.id,
      });
      for (const runPlayer of runPlayers) {
        const sessionPlayer = await this.gameSessionPlayerRepo.txFindOne(em, {
          sessionId: session,
          gameProfileId: runPlayer.gameProfileId,
        });

        if (!sessionPlayer) {
          // Ensure each run player has a row in this session (table: game.GameSessionPlayer)
          this.gameSessionPlayerRepo.txCreate(em, {
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

      await this.gameSessionRepo.txFlush(em);
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
      const session = await this.gameSessionRepo.txFindOne(em, {
        id: dto.sessionId,
      });
      if (!session) {
        throw new NotFoundException('game.session_not_found');
      }

      const { status, result } = this.mapEndStatus(dto.status);
      session.status = status;
      session.result = result;
      session.endedAt = new Date();
      session.completionTimeSec = Math.max(
        0,
        Math.floor(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
        ),
      );

      const isLobbySession = session.levelId.id === 'lobby';

      if (!isLobbySession) {
        const completionTimeSec = session.completionTimeSec ?? 0;
        const sessionPlayers = await this.gameSessionPlayerRepo.txFind(
          em,
          { sessionId: session.id },
          { populate: ['gameProfileId'] },
        );

        for (const sessionPlayer of sessionPlayers) {
          const profile = sessionPlayer.gameProfileId;
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

      await this.gameSessionRepo.txFlush(em);
    });

    return okResponse<null>('game.session_ended', null, path);
  }

  async endRun(dto: EndRunRequestDto, path: string) {
    await this.em.transactional(async (em) => {
      const run = await this.gameRunRepo.txFindOne(em, { id: dto.runId });
      if (!run) {
        throw new NotFoundException('game.run_not_found');
      }

      const sessions = await this.gameSessionRepo.txFind(em, {
        runId: run.id,
        levelId: { $ne: 'lobby' },
      });

      const totalTimeSec = sessions.reduce(
        (sum, s) => sum + (s.completionTimeSec ?? 0),
        0,
      );

      // isCompleted = true only when the caller explicitly passes isWin: true
      run.isCompleted = dto.isWin === true;
      run.completedAt = new Date();
      run.totalTimeSec = totalTimeSec;

      // Close the lobby session so it doesn't remain IN_PROGRESS indefinitely.
      await em.nativeUpdate(
        GameSession,
        { runId: run.id, levelId: 'lobby', status: GameSessionStatus.IN_PROGRESS },
        { 
          status: GameSessionStatus.FINISHED, 
          endedAt: new Date(),
          // Ignore completionTimeSec for lobby to avoid complex SQL
        },
      );

      await this.gameSessionRepo.txFlush(em);
    });

    return okResponse<null>('game.run_ended', null, path);
  }

  async leaveLobby(userId: string, lobbyId: string, path: string) {
    await this.em.transactional(async (em) => {
      const gameProfile = await this.gameProfileRepo.findGameProfileOrFail(
        em,
        userId,
      );

      const run = await this.gameRunRepo.findActiveLobbyRun(em, lobbyId);
      if (!run) {
        return;
      }

      const lobbySession = await this.gameSessionRepo.txFindOne(em, {
        runId: run.id,
        levelId: 'lobby',
      });

      if (!lobbySession) {
        return;
      }

      const sessionPlayer = await this.gameSessionPlayerRepo.txFindOne(em, {
        sessionId: lobbySession.id,
        gameProfileId: gameProfile.id,
      });

      if (!sessionPlayer) {
        return;
      }

      sessionPlayer.isAbsent = true;
      sessionPlayer.leftAt = new Date();

      await this.gameSessionRepo.txFlush(em);
    });

    return okResponse<null>('game.left_lobby', null, path);
  }

  private mapEndStatus(status: EndSessionStatus): {
    status: GameSessionStatus;
    result: SessionResult;
  } {
    switch (status) {
      case EndSessionStatus.FINISHED:
        return {
          status: GameSessionStatus.FINISHED,
          result: SessionResult.WIN,
        };
      case EndSessionStatus.FAILED:
        return {
          status: GameSessionStatus.FINISHED,
          result: SessionResult.LOSE,
        };
      case EndSessionStatus.ABANDONED:
      default:
        return {
          status: GameSessionStatus.ABANDONED,
          result: SessionResult.ABANDONED,
        };
    }
  }
}
