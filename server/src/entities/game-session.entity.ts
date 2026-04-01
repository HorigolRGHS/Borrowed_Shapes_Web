import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  Opt,
} from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import { GameSessionStatus, SessionResult } from './enums';
import type { GameRun } from './game-run.entity';
import type { Level } from './level.entity';
import type { GameSessionPlayer } from './game-session-player.entity';

const createId = init({ length: 24 });

@Index({ properties: ['run'] })
@Index({ properties: ['level'] })
@Index({ properties: ['status'] })
@Entity({ schema: 'game', tableName: 'GameSession' })
export class GameSession {
  @PrimaryKey()
  id: string & Opt = createId();

  @Enum(() => GameSessionStatus)
  status: GameSessionStatus & Opt = GameSessionStatus.WAITING;

  @Property()
  startedAt: Date & Opt = new Date();

  @Property({ nullable: true })
  endedAt?: Date & Opt | null;

  @Property({ default: 2 })
  minPlayers: number & Opt = 2;

  @Property({ default: 5 })
  maxPlayers: number & Opt = 5;

  @Enum({ items: () => SessionResult, nullable: true })
  result?: SessionResult & Opt | null;

  @Property({ nullable: true })
  completionTimeSec?: number & Opt | null;

  @ManyToOne('GameRun', { ref: true })
  run!: Ref<GameRun>;

  @ManyToOne('Level', { ref: true })
  level!: Ref<Level>;

  @OneToMany('GameSessionPlayer', 'session')
  players = new Collection<GameSessionPlayer>(this);
}
