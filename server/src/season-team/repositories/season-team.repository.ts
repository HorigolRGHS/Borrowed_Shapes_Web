import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { SeasonTeam } from '../../entities/SeasonTeam';

@Injectable()
export class SeasonTeamRepository extends BaseRepository<SeasonTeam> {
  constructor(em: EntityManager) {
    super(em, SeasonTeam);
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
  async removeAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().removeAndFlush(entity);
  }
}
