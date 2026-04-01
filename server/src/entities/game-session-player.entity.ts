import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Unique,
  Index,
  Opt,
} from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { GameSession } from './game-session.entity';
import type { GameProfile } from './game-profile.entity';

const createId = init({ length: 24 });

@Unique({ properties: ['session', 'gameProfile'] })
@Index({ properties: ['gameProfile'] })
@Index({ properties: ['session'] })
@Entity({ schema: 'game', tableName: 'GameSessionPlayer' })
export class GameSessionPlayer {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property({ default: false })
  isAbsent: boolean & Opt = false;

  @Property({ nullable: true })
  leftAt?: Date & Opt | null;

  @ManyToOne('GameSession', { ref: true })
  session!: Ref<GameSession>;

  @ManyToOne('GameProfile', { ref: true })
  gameProfile!: Ref<GameProfile>;
}
