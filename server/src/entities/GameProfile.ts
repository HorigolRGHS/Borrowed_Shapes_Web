import { Collection, Entity, ManyToMany, ManyToOne, OneToOne, type Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { Achievement } from './Achievement';
import { User } from './User';

@Entity({ schema: 'game' })
export class GameProfile {

  @PrimaryKey({ type: 'text', defaultRaw: `('BS'::text || lpad((nextval('game.gameprofile_id_seq'::regclass))::text, 8, '0'::text))` })
  id!: string & Opt;

  @Unique({ name: 'GameProfile_userId_key', expression: 'CREATE UNIQUE INDEX "GameProfile_userId_key" ON game."GameProfile" USING btree ("userId")' })
  @OneToOne({ entity: () => User, fieldName: 'userId', deleteRule: 'cascade' })
  userId!: User;

  @Property({ type: 'integer' })
  totalPlayTime: number & Opt = 0;

  @Property({ type: 'integer' })
  totalSessions: number & Opt = 0;

  @Property({ type: 'integer' })
  totalWins: number & Opt = 0;

  @Property({ type: 'integer' })
  totalLosses: number & Opt = 0;

  @Property({ type: 'integer' })
  totalAbandoned: number & Opt = 0;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;

  @ManyToOne({ entity: () => Achievement, fieldName: 'equippedAchievementId', nullable: true })
  equippedAchievementId?: Achievement;

  @ManyToMany({ entity: () => Achievement, joinColumn: 'gameProfileId', inverseJoinColumn: 'achievementId' })
  UserAchievement = new Collection<Achievement>(this);

}
