import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameRun } from '../../entities/GameRun';

@Injectable()
export class GameRunRepository extends BaseRepository<GameRun> {
  constructor(em: EntityManager) {
    super(em, GameRun);
  }

  async findActiveLobbyRun(
    em: EntityManager,
    lobbyId: string,
  ): Promise<GameRun | null> {
    return em.findOne(
      GameRun,
      { lobbyId, isCompleted: false },
      { orderBy: { startedAt: 'desc' } },
    );
  }
}
