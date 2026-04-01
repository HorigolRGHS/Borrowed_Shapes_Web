import { Entity, ManyToOne, Property, Opt } from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import type { GameProfile } from './game-profile.entity';
import type { Achievement } from './achievement.entity';

@Entity({ schema: 'game', tableName: 'UserAchievement' })
export class UserAchievement {
  @ManyToOne('GameProfile', { ref: true, primary: true })
  gameProfile!: Ref<GameProfile>;

  @ManyToOne('Achievement', { ref: true, primary: true })
  achievement!: Ref<Achievement>;

  @Property()
  achievedAt: Date & Opt = new Date();
}
