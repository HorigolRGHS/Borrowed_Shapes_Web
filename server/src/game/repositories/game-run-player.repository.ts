import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameRunPlayer } from '../../entities/GameRunPlayer';

@Injectable()
export class GameRunPlayerRepository extends BaseRepository<GameRunPlayer> {
  constructor(em: EntityManager) {
    super(em, GameRunPlayer);
  }
}
