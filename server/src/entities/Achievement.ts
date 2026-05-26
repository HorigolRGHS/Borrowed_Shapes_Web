import { Entity, Enum, type Opt, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ schema: 'game' })
export class Achievement {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ type: 'text', unique: 'Achievement_name_key' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text' })
  criteriaCode!: string;

  @Property({ type: 'text' })
  badgeImageUrl!: string;

  @Enum({ items: () => AchievementType })
  type: AchievementType & Opt = AchievementType.PERMANENT;

  @Property({ type: 'date', nullable: true })
  seasonMonth?: string;

  @Property({ nullable: true })
  expiresAt?: Date;

}

export enum AchievementType {
  PERMANENT = 'PERMANENT',
  SEASONAL = 'SEASONAL',
}
