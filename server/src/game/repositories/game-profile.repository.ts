import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { GameProfile } from '../../entities/GameProfile';

@Injectable()
export class GameProfileRepository extends BaseRepository<GameProfile> {
  constructor(em: EntityManager) {
    super(em, GameProfile);
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }

  async persist(entity: any): Promise<void> {
    this.getEntityManager().persist(entity);
  }

  async persistAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().persistAndFlush(entity);
  }

  async findGameProfileOrFail(
    em: EntityManager,
    userId: string,
  ): Promise<GameProfile> {
    const gameProfile = await em.findOne(GameProfile, { userId });
    if (!gameProfile) {
      throw new NotFoundException('game.profile_not_found');
    }
    return gameProfile;
  }
}
