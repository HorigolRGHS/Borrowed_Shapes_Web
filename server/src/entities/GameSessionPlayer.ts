import { Entity, Index, ManyToOne, type Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { GameProfile } from './GameProfile';
import { GameSession } from './GameSession';

@Entity({ schema: 'game' })
@Unique({ name: 'GameSessionPlayer_sessionId_gameProfileId_key', expression: 'CREATE UNIQUE INDEX "GameSessionPlayer_sessionId_gameProfileId_key" ON game."GameSessionPlayer" USING btree ("sessionId", "gameProfileId")', properties: ['sessionId', 'gameProfileId'] })
export class GameSessionPlayer {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({ name: 'GameSessionPlayer_sessionId_idx', expression: 'CREATE INDEX "GameSessionPlayer_sessionId_idx" ON game."GameSessionPlayer" USING btree ("sessionId")' })
  @ManyToOne({ entity: () => GameSession, fieldName: 'sessionId', deleteRule: 'cascade' })
  sessionId!: GameSession;

  @Index({ name: 'GameSessionPlayer_gameProfileId_idx', expression: 'CREATE INDEX "GameSessionPlayer_gameProfileId_idx" ON game."GameSessionPlayer" USING btree ("gameProfileId")' })
  @ManyToOne({ entity: () => GameProfile, fieldName: 'gameProfileId', deleteRule: 'cascade' })
  gameProfileId!: GameProfile;

  @Property({ type: 'boolean' })
  isAbsent: boolean & Opt = false;

  @Property({ nullable: true })
  leftAt?: Date;

}
