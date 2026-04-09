import { Entity, Index, ManyToOne, type Opt, PrimaryKeyProp, Property } from '@mikro-orm/core';
import { GameProfile } from './GameProfile';
import { GameRun } from './GameRun';

@Entity({ schema: 'game' })
export class GameRunPlayer {

  [PrimaryKeyProp]?: ['runId', 'gameProfileId'];

  @ManyToOne({ entity: () => GameRun, fieldName: 'runId', deleteRule: 'cascade', primary: true })
  runId!: GameRun;

  @Index({ name: 'GameRunPlayer_gameProfileId_idx', expression: 'CREATE INDEX "GameRunPlayer_gameProfileId_idx" ON game."GameRunPlayer" USING btree ("gameProfileId")' })
  @ManyToOne({ entity: () => GameProfile, fieldName: 'gameProfileId', deleteRule: 'cascade', primary: true })
  gameProfileId!: GameProfile;

  @Property({ type: 'boolean' })
  isHost: boolean & Opt = false;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  joinedAt!: Date & Opt;

}
