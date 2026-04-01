import { Entity, ManyToOne, Property, Index, Opt } from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import type { GameRun } from './game-run.entity';
import type { GameProfile } from './game-profile.entity';

@Index({ properties: ['gameProfile'] })
@Entity({ schema: 'game', tableName: 'GameRunPlayer' })
export class GameRunPlayer {
  @ManyToOne('GameRun', { ref: true, primary: true })
  run!: Ref<GameRun>;

  @ManyToOne('GameProfile', { ref: true, primary: true })
  gameProfile!: Ref<GameProfile>;

  @Property({ default: false })
  isHost: boolean & Opt = false;
}
