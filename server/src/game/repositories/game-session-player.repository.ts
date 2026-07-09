import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameSessionPlayer } from '../../entities/GameSessionPlayer';

@Injectable()
export class GameSessionPlayerRepository extends EntityRepository<GameSessionPlayer> {
  constructor(em: EntityManager) {
    super(em, GameSessionPlayer);
  }
}
