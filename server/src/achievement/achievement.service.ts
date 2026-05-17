import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';


@Injectable()
export class AchievementService {
  constructor(private em: EntityManager) {}

  async findAll(): Promise<Achievement[]> {
    return this.em.find(Achievement, {});
  }

  async findOne(id: string): Promise<Achievement> {
    const achievement = await this.em.findOne(Achievement, { id });
    if (!achievement) {
      throw new NotFoundException('achievements.not_found');
    }
    return achievement;
  }

  async findByUser(gameProfileId: string): Promise<UserAchievement[]> {
    return this.em.find(UserAchievement, { gameProfileId }, { populate: ['achievementId'] });
  }

  async create(dto: CreateAchievementDto): Promise<Achievement> {
    const existing = await this.em.findOne(Achievement, { criteriaCode: dto.criteriaCode });
    if (existing) {
      throw new BadRequestException('achievements.already_exists');
    }

    const achievement = this.em.create(Achievement, {
    ...dto,
    seasonMonth: dto.seasonMonth
      ? `${dto.seasonMonth}-01`
      : null,
    });
    await this.em.persistAndFlush(achievement);
    return achievement;
  }

  async update(id: string, dto: UpdateAchievementDto): Promise<Achievement> {
    const achievement = await this.findOne(id);
    if (dto.criteriaCode) {
      const existing = await this.em.findOne(Achievement, { criteriaCode: dto.criteriaCode, id: { $ne: id } });
      if (existing) {
        throw new BadRequestException('achievements.already_exists');
      }
    }
    this.em.assign(achievement, {
    ...dto,
    seasonMonth: dto.seasonMonth
      ? `${dto.seasonMonth}-01`
      : null,
  });
    await this.em.flush();
    return achievement;
  }

  async delete(id: string): Promise<void> {
    const achievement = await this.findOne(id);
    await this.em.removeAndFlush(achievement);
  }

  async search(query: string): Promise<Achievement[]> {
  query = query?.trim();
  if (!query) {
    return [];
  }
  return this.em.find(Achievement, {
    $or: [
      { name: { $ilike: `%${query}%` } },
      { description: { $ilike: `%${query}%` } },
    ],
  });
}
}