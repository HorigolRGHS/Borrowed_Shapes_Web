import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameProfile } from '../../entities/GameProfile';

@Injectable()
export class GameProfileRepository extends EntityRepository<GameProfile> {
  constructor(em: EntityManager) {
    super(em, GameProfile);
  }

  async findGameProfileOrFail(em: EntityManager, userId: string): Promise<GameProfile> {
    const gameProfile = await em.findOne(GameProfile, { userId });
    if (!gameProfile) {
      throw new NotFoundException('game.profile_not_found');
    }
    return gameProfile;
  }
}
