import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { UserAchievement } from './user-achievement.entity';

const createId = init({ length: 24 });

@Entity({ schema: 'game', tableName: 'Achievement' })
export class Achievement {
  @PrimaryKey()
  id: string = createId();

  @Property({ unique: true })
  name!: string;

  @Property()
  criteriaCode!: string;

  @Property()
  badgeImageUrl!: string;

  @Property()
  rewardPoints!: number;

  @OneToMany('UserAchievement', 'achievement')
  userAchievements = new Collection<UserAchievement>(this);
}
