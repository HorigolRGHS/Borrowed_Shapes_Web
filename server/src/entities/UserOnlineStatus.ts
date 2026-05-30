import { Entity, Index, OneToOne, type Opt, PrimaryKeyProp, Property } from '@mikro-orm/core';
import { User } from './User';

@Entity({ schema: 'auth' })
export class UserOnlineStatus {

  [PrimaryKeyProp]?: 'userId';

  @OneToOne({ entity: () => User, fieldName: 'userId', deleteRule: 'cascade', primary: true })
  userId!: User;

  @Index({ name: 'UserOnlineStatus_isOnline_idx', expression: 'CREATE INDEX "UserOnlineStatus_isOnline_idx" ON auth."UserOnlineStatus" USING btree ("isOnline") WHERE ("isOnline" = true)' })
  @Property({ type: 'boolean' })
  isOnline: boolean & Opt = false;

  @Index({ name: 'UserOnlineStatus_lastOnline_idx', expression: 'CREATE INDEX "UserOnlineStatus_lastOnline_idx" ON auth."UserOnlineStatus" USING btree ("lastOnline")' })
  @Property({ nullable: true })
  lastOnline?: Date;

  @Property({ type: 'json', nullable: true })
  onlinePlatforms?: any;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;

}
