import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { SeasonTeamMember } from '../../entities/SeasonTeamMember';

@Injectable()
export class SeasonTeamMemberRepository extends BaseRepository<SeasonTeamMember> {
  constructor(em: EntityManager) {
    super(em, SeasonTeamMember);
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }
  async persist(entity: any): void {
    this.getEntityManager().persist(entity);
  }
  async persistAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().persistAndFlush(entity);
  }
  async removeAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().removeAndFlush(entity);
  }
}
