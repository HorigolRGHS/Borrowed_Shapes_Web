import {
  Entity,
  Property,
  Index,
  OneToOne,
  Opt,
} from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import type { User } from './user.entity';

@Index({ properties: ['lastOnline'] })
@Entity({ schema: 'game', tableName: 'UserOnlineStatus' })
export class UserOnlineStatus {
  @OneToOne('User', { ref: true, primary: true })
  user!: Ref<User>;

  @Property({ default: false })
  isOnline: boolean & Opt = false;

  @Property({ nullable: true })
  lastOnline?: Date & Opt | null;

  @Property({ nullable: true, type: 'json' })
  onlinePlatforms?: unknown & Opt;

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
