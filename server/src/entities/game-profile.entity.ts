import {
  Entity,
  PrimaryKey,
  Property,
  OneToOne,
  OneToMany,
  Collection,
  Opt,
} from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { User } from './user.entity';
import type { UserAchievement } from './user-achievement.entity';
import type { GameRunPlayer } from './game-run-player.entity';
import type { GameSessionPlayer } from './game-session-player.entity';

const createId = init({ length: 24 });

@Entity({ schema: 'game', tableName: 'GameProfile' })
export class GameProfile {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property({ default: 0 })
  totalPlayTime: number & Opt = 0;

  @Property({ default: 0 })
  totalSessions: number & Opt = 0;

  @Property({ default: 0 })
  totalWins: number & Opt = 0;

  @Property({ default: 0 })
  totalLosses: number & Opt = 0;

  @Property({ default: 0 })
  totalAbandoned: number & Opt = 0;

  @Property()
  createdAt: Date & Opt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();

  @OneToOne('User', { ref: true, unique: true })
  user!: Ref<User>;

  @OneToMany('UserAchievement', 'gameProfile')
  achievements = new Collection<UserAchievement>(this);

  @OneToMany('GameRunPlayer', 'gameProfile')
  gameRunPlayers = new Collection<GameRunPlayer>(this);

  @OneToMany('GameSessionPlayer', 'gameProfile')
  gameSessionPlayers = new Collection<GameSessionPlayer>(this);
}
