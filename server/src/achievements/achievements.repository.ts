import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { GameProfile } from '../entities/GameProfile';

@Injectable()
export class AchievementRepository {
  constructor(private readonly em: EntityManager) {}

  async findAll(): Promise<Achievement[]> {
    return this.em.find(Achievement, {});
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    return this.em.execute(sql, params);
  }

  async findOne(id: string): Promise<Achievement | null> {
    return this.em.findOne(Achievement, { id });
  }

  async findOneByCriteria(criteriaCode: string): Promise<Achievement | null> {
    return this.em.findOne(Achievement, { criteriaCode });
  }

  async findOneByCriteriaExcludeId(criteriaCode: string, id: string): Promise<Achievement | null> {
    return this.em.findOne(Achievement, { criteriaCode, id: { $ne: id } });
  }

  async countUserAchievements(achievementId: string): Promise<number> {
    return this.em.count(UserAchievement, { achievementId });
  }

  async findUserAchievements(gameProfileId: string): Promise<UserAchievement[]> {
    return this.em.find(UserAchievement, { gameProfileId }, { populate: ['achievementId'] });
  }

  async findOneUserAchievement(gameProfileId: string, achievementId: string): Promise<UserAchievement | null> {
    return this.em.findOne(UserAchievement, { gameProfileId, achievementId });
  }

  createAchievement(data: any): Achievement {
    return this.em.create(Achievement, data);
  }

  createUserAchievement(data: any): UserAchievement {
    return this.em.create(UserAchievement, data);
  }

  async persistAndFlush(entity: any): Promise<void> {
    await this.em.persistAndFlush(entity);
  }

  assign(achievement: Achievement, data: any): void {
    this.em.assign(achievement, data);
  }

  async flush(): Promise<void> {
    await this.em.flush();
  }

  async removeAndFlush(achievement: Achievement): Promise<void> {
    await this.em.removeAndFlush(achievement);
  }

  async findGameProfilesWithEquippedAchievements(): Promise<GameProfile[]> {
    return this.em.find(
      GameProfile,
      { equippedAchievementId: { $ne: null } },
      { populate: ['equippedAchievementId'] },
    );
  }
}
