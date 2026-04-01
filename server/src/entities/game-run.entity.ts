import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
  Index,
} from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { GameRunPlayer } from './game-run-player.entity';
import type { GameSession } from './game-session.entity';

const createId = init({ length: 24 });

@Index({ properties: ['isCompleted', 'totalTimeSec'] })
@Index({ properties: ['lobbyId'] })
@Entity({ schema: 'game', tableName: 'GameRun' })
export class GameRun {
  @PrimaryKey()
  id: string = createId();

  @Property()
  totalLevels!: number;

  @Property({ default: false })
  isCompleted: boolean = false;

  @Property({ nullable: true })
  totalTimeSec?: number | null;

  @Property()
  startedAt: Date = new Date();

  @Property({ nullable: true })
  completedAt?: Date | null;

  @Property({ nullable: true })
  lobbyId?: string | null;

  @OneToMany('GameRunPlayer', 'run')
  players = new Collection<GameRunPlayer>(this);

  @OneToMany('GameSession', 'run')
  sessions = new Collection<GameSession>(this);
}
