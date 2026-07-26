import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BaseRepository } from '../../common/repositories/base.repository';
import { SeasonTeamMember } from '../../entities/SeasonTeamMember';

@Injectable()
export class SeasonTeamMemberRepository extends BaseRepository<SeasonTeamMember> {
  constructor(em: EntityManager) {
    super(em, SeasonTeamMember);
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

  async findByProfileId(
    seasonMonth: string,
    gameProfileId: string,
  ): Promise<SeasonTeamMember | null> {
    return this.findOne({ seasonMonth, gameProfileId });
  }

  async countTeamMembers(seasonMonth: string, teamId: string): Promise<number> {
    return this.count({ seasonMonth, teamId });
  }

  async findMyMemberWithTeam(
    seasonMonth: string,
    gameProfileId: string,
  ): Promise<SeasonTeamMember | null> {
    return this.findOne(
      { seasonMonth, gameProfileId },
      { populate: ['teamId'] },
    );
  }

  async findMyMemberWithTeamAndLeader(
    seasonMonth: string,
    gameProfileId: string,
  ): Promise<SeasonTeamMember | null> {
    return this.findOne(
      { seasonMonth, gameProfileId },
      { populate: ['teamId', 'teamId.leaderId'] },
    );
  }

  async findTargetMember(
    seasonMonth: string,
    teamId: string,
    gameProfileId: string,
  ): Promise<SeasonTeamMember | null> {
    return this.findOne({ seasonMonth, teamId, gameProfileId });
  }

  async findTeamMembersDetail(
    seasonMonth: string,
    teamId: string,
  ): Promise<SeasonTeamMember[]> {
    return this.find(
      { seasonMonth, teamId },
      {
        populate: [
          'gameProfileId',
          'gameProfileId.userId',
          'gameProfileId.equippedAchievementId',
        ],
        orderBy: { joinedAt: 'asc' },
      },
    );
  }
}
