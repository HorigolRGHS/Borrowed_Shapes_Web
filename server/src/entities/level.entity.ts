import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import type { GameSession } from './game-session.entity';

@Entity({ schema: 'game', tableName: 'Level' })
export class Level {
  @PrimaryKey()
  id!: string; // manually set, not auto-generated

  @Property()
  displayName!: string;

  @Property({ unique: true })
  order!: number;

  @OneToMany('GameSession', 'level')
  gameSessions = new Collection<GameSession>(this);
}
