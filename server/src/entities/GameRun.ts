import { Collection, Entity, Index, ManyToMany, type Opt, PrimaryKey, Property } from '@mikro-orm/core';
import { GameProfile } from './GameProfile';

@Entity({ schema: 'game' })
export class GameRun {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({ name: 'GameRun_lobbyId_idx', expression: 'CREATE INDEX "GameRun_lobbyId_idx" ON game."GameRun" USING btree ("lobbyId")' })
  @Property({ type: 'text', nullable: true })
  lobbyId?: string;

  @Index({ name: 'GameRun_lobbyCode_idx', expression: 'CREATE INDEX "GameRun_lobbyCode_idx" ON game."GameRun" USING btree ("lobbyCode") WHERE ("lobbyCode" IS NOT NULL)' })
  @Property({ type: 'text', nullable: true })
  lobbyCode?: string;

  @Property({ type: 'text', nullable: true })
  lobbyName?: string;

  @Index({ name: 'GameRun_isPrivate_idx', expression: 'CREATE INDEX "GameRun_isPrivate_idx" ON game."GameRun" USING btree ("isPrivate") WHERE ("isPrivate" = false)' })
  @Property({ type: 'boolean' })
  isPrivate: boolean & Opt = false;

  @Property()
  totalLevels!: number;

  @Property({ type: 'boolean' })
  isCompleted: boolean & Opt = false;

  @Index({ name: 'GameRun_leaderboard_idx', expression: 'CREATE INDEX "GameRun_leaderboard_idx" ON game."GameRun" USING btree ("totalTimeSec") WHERE ("isCompleted" = true)' })
  @Property({ nullable: true })
  totalTimeSec?: number;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  startedAt!: Date & Opt;

  @Property({ nullable: true })
  completedAt?: Date;

  @ManyToMany({ entity: () => GameProfile, joinColumn: 'runId', inverseJoinColumn: 'gameProfileId' })
  GameRunPlayer = new Collection<GameProfile>(this);

}
