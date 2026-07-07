import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameRunPlayer } from '../../entities/GameRunPlayer';

@Injectable()
export class GameRunPlayerRepository extends EntityRepository<GameRunPlayer> {
  constructor(em: EntityManager) {
    super(em, GameRunPlayer);
  }
}
