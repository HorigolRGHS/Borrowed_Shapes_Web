import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { SeasonTeam } from '../../entities/SeasonTeam';

@Injectable()
export class SeasonTeamRepository extends EntityRepository<SeasonTeam> {
  constructor(em: EntityManager) {
    super(em, SeasonTeam);
  }

  async findByCodeWithLeader(seasonMonth: string, code: string): Promise<SeasonTeam | null> {
    return this.findOne({ seasonMonth, code }, { populate: ['leaderId'] });
  }

  async findByIdWithLeader(id: string, seasonMonth: string): Promise<SeasonTeam | null> {
    return this.findOne({ id, seasonMonth }, { populate: ['leaderId'] });
  }
}
