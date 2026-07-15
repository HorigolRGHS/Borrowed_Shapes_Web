import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameSession } from '../../entities/GameSession';
import { GameSessionStatus } from '../../entities/GameSessionStatus';

@Injectable()
export class GameSessionRepository extends BaseRepository<GameSession> {
  constructor(em: EntityManager) {
    super(em, GameSession);
  }

  async isRunLocked(em: EntityManager, runId: string): Promise<boolean> {
    const nonLobbySession = await em.findOne(GameSession, {
      runId,
      levelId: { $ne: 'lobby' },
    });
    return Boolean(nonLobbySession);
  }

  async findActiveSession(
    em: EntityManager,
    runId: string,
  ): Promise<GameSession | null> {
    return em.findOne(GameSession, {
      runId,
      status: GameSessionStatus.IN_PROGRESS,
    });
  }
}
