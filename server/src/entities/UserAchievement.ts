import { Entity, ManyToOne, type Opt, PrimaryKeyProp, Property } from '@mikro-orm/core';
import { Achievement } from './Achievement';
import { GameProfile } from './GameProfile';

@Entity({ schema: 'game' })
export class UserAchievement {

  [PrimaryKeyProp]?: ['gameProfileId', 'achievementId'];

  @ManyToOne({ entity: () => GameProfile, fieldName: 'gameProfileId', deleteRule: 'cascade', primary: true })
  gameProfileId!: GameProfile;

  @ManyToOne({ entity: () => Achievement, fieldName: 'achievementId', deleteRule: 'cascade', primary: true })
  achievementId!: Achievement;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  achievedAt!: Date & Opt;

}
