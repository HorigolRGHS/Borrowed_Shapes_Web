import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameSessionPlayer } from '../../entities/GameSessionPlayer';

@Injectable()
export class GameSessionPlayerRepository extends BaseRepository<GameSessionPlayer> {
  constructor(em: EntityManager) {
    super(em, GameSessionPlayer);
  }
}
