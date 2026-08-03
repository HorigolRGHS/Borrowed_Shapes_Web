import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  type Opt,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Game$46GameSessionStatus } from './Game$46GameSessionStatus';
import { Game$46SessionResult } from './Game$46SessionResult';
import { GameRun } from './GameRun';
import { Level } from './Level';

@Entity({ schema: 'game' })
export class GameSession {
  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({
    name: 'GameSession_runId_idx',
    expression:
      'CREATE INDEX "GameSession_runId_idx" ON game."GameSession" USING btree ("runId")',
  })
  @ManyToOne({
    entity: () => GameRun,
    fieldName: 'runId',
    deleteRule: 'cascade',
  })
  runId!: GameRun;

  @Index({
    name: 'GameSession_levelId_idx',
    expression:
      'CREATE INDEX "GameSession_levelId_idx" ON game."GameSession" USING btree ("levelId")',
  })
  @ManyToOne({ entity: () => Level, fieldName: 'levelId' })
  levelId!: Level;

  @Enum({
    items: () => Game$46GameSessionStatus,
    nativeEnumName: 'game.GameSessionStatus',
    index: 'GameSession_status_idx',
  })
  status: Game$46GameSessionStatus & Opt = Game$46GameSessionStatus.WAITING;

  @Property({ type: 'integer' })
  minPlayers: number & Opt = 2;

  @Property({ type: 'integer' })
  maxPlayers: number & Opt = 5;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  startedAt!: Date & Opt;

  @Property({ nullable: true })
  endedAt?: Date;

  @Enum({
    items: () => Game$46SessionResult,
    nativeEnumName: 'game.SessionResult',
    nullable: true,
  })
  result?: Game$46SessionResult;

  @Property({ nullable: true })
  completionTimeSec?: number;
}
