import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { okResponse } from '../common/dto/api-response.dto';
import { GameRun } from '../entities/game-run.entity';
import { GameRunPlayer } from '../entities/game-run-player.entity';
import { GameSession } from '../entities/game-session.entity';
import { GameSessionPlayer } from '../entities/game-session-player.entity';
import { GameProfile } from '../entities/game-profile.entity';
import { Level } from '../entities/level.entity';
import { GameSessionStatus, SessionResult } from '../entities/enums';
import { InitGameRunDto } from './dto/init-game-run.dto';
import { JoinLobbyDto } from './dto/join-lobby.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto, EndSessionStatus } from './dto/end-session.dto';
import { RunIdResponseDto, SessionIdResponseDto } from './dto/game-response.dto';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly em: EntityManager) {}

  async initRun(userId: string, dto: InitGameRunDto, path: string) {
    this.logger.log(
      `GameService.initRun userId=${userId} body=${JSON.stringify(dto)}`,
    );

    const runId = await this.em.transactional(async (em) => {
      const gameProfile = await this.findGameProfileOrFail(em, userId);
      const lobbyLevel = await em.findOne(Level, { id: 'lobby' });

      if (!lobbyLevel) {
        throw new BadRequestException('Lobby level is not configured');
      }

      const run = em.create(GameRun, {
        lobbyId: dto.lobbyId,
        totalLevels: dto.totalLevels,
        isCompleted: false,
        startedAt: new Date(),
      });

      em.create(GameRunPlayer, {
        run,
        gameProfile,
        isHost: true,
      });

      const lobbySession = em.create(GameSession, {
        run,
        level: lobbyLevel,
        status: GameSessionStatus.WAITING,
        startedAt: new Date(),
        minPlayers: dto.minPlayers,
        maxPlayers: dto.maxPlayers,
      });

      em.create(GameSessionPlayer, {
        session: lobbySession,
        gameProfile,
        isAbsent: false,
      });

      await em.flush();
      return run.id;
    });

    this.logger.log(`GameService.initRun completed runId=${runId}`);

    return okResponse<RunIdResponseDto>(
      'Game run initialized successfully',
      { runId },
      path,
    );
  }

  async joinLobby(userId: string, dto: JoinLobbyDto, path: string) {
    this.logger.log(`GameService.joinLobby userId=${userId} body=${JSON.stringify(dto)}`);

    const runId = await this.em.transactional(async (em) => {
      const gameProfile = await this.findGameProfileOrFail(em, userId);
      const run = await em.findOne(
        GameRun,
        { lobbyId: dto.lobbyId, isCompleted: false },
        { orderBy: { startedAt: 'desc' } },
      );
      if (!run) {
        throw new NotFoundException('Game run not found for this lobby');
      }

      const existing = await em.findOne(GameRunPlayer, {
        run: run.id,
        gameProfile: gameProfile.id,
      });

      if (!existing) {
        em.create(GameRunPlayer, {
          run,
          gameProfile,
          isHost: false,
        });
      }

      const lobbySession = await em.findOne(GameSession, {
        run: run.id,
        level: 'lobby',
      });

      if (!lobbySession) {
        throw new NotFoundException('Lobby session not found');
      }

      const sessionPlayer = await em.findOne(GameSessionPlayer, {
        session: lobbySession.id,
        gameProfile: gameProfile.id,
      });

      if (!sessionPlayer) {
        em.create(GameSessionPlayer, {
          session: lobbySession,
          gameProfile,
          isAbsent: false,
        });
      } else {
        sessionPlayer.isAbsent = false;
        sessionPlayer.leftAt = null;
      }

      await em.flush();
      this.logger.log(`GameService.joinLobby synced player userId=${userId} runId=${run.id}`);

      return run.id;
    });

    return okResponse<RunIdResponseDto>(
      'Joined game run successfully',
      { runId },
      path,
    );
  }

  async startSession(dto: StartSessionDto, path: string) {
    this.logger.log(`GameService.startSession body=${JSON.stringify(dto)}`);

    const sessionId = await this.em.transactional(async (em) => {
      const run = await em.findOne(GameRun, { id: dto.runId });
      if (!run) {
        throw new NotFoundException('Game run not found');
      }

      const level = await em.findOne(Level, { id: dto.levelId });
      if (!level) {
        throw new NotFoundException('Level not found');
      }

      let session = await em.findOne(
        GameSession,
        { run: run.id, level: level.id },
        { populate: ['run', 'level', 'players.gameProfile'] },
      );

      if (!session) {
        const lobbySession = await em.findOne(GameSession, {
          run: run.id,
          level: 'lobby',
        });
        const minPlayers = lobbySession?.minPlayers ?? 2;
        const maxPlayers = lobbySession?.maxPlayers ?? 5;

        session = em.create(GameSession, {
          run,
          level,
          status: GameSessionStatus.WAITING,
          startedAt: new Date(),
          minPlayers,
          maxPlayers,
        });
      }

      const runPlayers = await em.find(GameRunPlayer, { run: run.id });
      for (const runPlayer of runPlayers) {
        const sessionPlayer = await em.findOne(GameSessionPlayer, {
          session: session.id,
          gameProfile: runPlayer.gameProfile,
        });

        if (!sessionPlayer) {
          em.create(GameSessionPlayer, {
            session,
            gameProfile: runPlayer.gameProfile,
            isAbsent: false,
          });
        } else {
          sessionPlayer.isAbsent = false;
          sessionPlayer.leftAt = null;
        }
      }

      session.status = GameSessionStatus.IN_PROGRESS;
      session.startedAt = new Date();

      await em.flush();
      this.logger.log(
        `GameService.startSession started sessionId=${session.id} runId=${run.id} levelId=${level.id}`,
      );
      return session.id;
    });

    return okResponse<SessionIdResponseDto>(
      'Session started',
      { sessionId },
      path,
    );
  }

  async endSession(dto: EndSessionDto, path: string) {
    this.logger.log(`GameService.endSession body=${JSON.stringify(dto)}`);

    await this.em.transactional(async (em) => {
      const session = await em.findOne(
        GameSession,
        { id: dto.sessionId },
        { populate: ['run', 'level', 'players.gameProfile'] },
      );
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const { status, result } = this.mapEndStatus(dto.status);
      session.status = status;
      session.result = result;
      session.completionTimeSec = dto.completionTimeSec;
      session.endedAt = new Date();

      const isLobbySession = session.level.id === 'lobby';

      if (!isLobbySession) {
        for (const sessionPlayer of session.players) {
          const profile = sessionPlayer.gameProfile as GameProfile;
          profile.totalSessions += 1;
          profile.totalPlayTime += dto.completionTimeSec;

          if (result === SessionResult.WIN) {
            profile.totalWins += 1;
          } else if (result === SessionResult.LOSE) {
            profile.totalLosses += 1;
          } else {
            profile.totalAbandoned += 1;
          }
        }
      }

      if (status === GameSessionStatus.FINISHED) {
        const run = await em.findOne(GameRun, { id: session.run.id });
        if (!run) {
          throw new NotFoundException('Game run not found');
        }

        const finishedCount = await em.count(GameSession, {
          run: run.id,
          status: GameSessionStatus.FINISHED,
        });

        if (finishedCount >= run.totalLevels) {
          run.isCompleted = true;
          run.completedAt = new Date();
          run.totalTimeSec = Math.max(
            0,
            Math.floor((run.completedAt.getTime() - run.startedAt.getTime()) / 1000),
          );
          this.logger.log(`GameService.endSession marked run completed runId=${run.id}`);
        }
      }

      await em.flush();
      this.logger.log(`GameService.endSession completed sessionId=${session.id} status=${session.status}`);
    });

    return okResponse<null>(
      'Session ended successfully',
      null,
      path,
    );
  }

  async leaveLobby(userId: string, lobbyId: string, path: string) {
    this.logger.log(`GameService.leaveLobby userId=${userId} lobbyId=${lobbyId}`);

    await this.em.transactional(async (em) => {
      const gameProfile = await this.findGameProfileOrFail(em, userId);

      const run = await em.findOne(
        GameRun,
        { lobbyId, isCompleted: false },
        { orderBy: { startedAt: 'desc' } },
      );
      if (!run) {
        this.logger.warn(`GameService.leaveLobby no active run found for lobbyId=${lobbyId}`);
        return;
      }

      const lobbySession = await em.findOne(GameSession, {
        run: run.id,
        level: 'lobby',
      });

      if (!lobbySession) {
        this.logger.warn(`GameService.leaveLobby no lobby session found for runId=${run.id}`);
        return;
      }

      const sessionPlayer = await em.findOne(GameSessionPlayer, {
        session: lobbySession.id,
        gameProfile: gameProfile.id,
      });

      if (!sessionPlayer) {
        this.logger.warn(
          `GameService.leaveLobby session player not found userId=${userId} sessionId=${lobbySession.id}`,
        );
        return;
      }

      sessionPlayer.isAbsent = true;
      sessionPlayer.leftAt = new Date();

      await em.flush();
      this.logger.log(
        `GameService.leaveLobby marked absent userId=${userId} sessionId=${lobbySession.id}`,
      );
    });

    return okResponse<null>(
      'Left lobby',
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
    const gameProfile = await em.findOne(GameProfile, { user: userId });
    if (!gameProfile) {
      throw new NotFoundException('Game profile not found');
    }
    return gameProfile;
  }
}
