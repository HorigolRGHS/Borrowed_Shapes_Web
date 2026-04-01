import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  Index,
  Opt,
} from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import { SessionStatus } from './enums';
import type { User } from './user.entity';

const createId = init({ length: 24 });

@Index({ properties: ['user'] })
@Index({ properties: ['loginTime'] })
@Entity({ schema: 'auth', tableName: 'UserSession' })
export class UserSession {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property({ unique: true })
  sessionId!: string;

  @Property({ nullable: true })
  platform?: string & Opt | null;

  @Property()
  loginTime: Date & Opt = new Date();

  @Property({ nullable: true })
  logoutTime?: Date & Opt | null;

  @Property({ nullable: true })
  deviceInfo?: string & Opt | null;

  @Property()
  ipAddress!: string;

  @Enum(() => SessionStatus)
  status: SessionStatus & Opt = SessionStatus.ACTIVE;

  @ManyToOne('User', { ref: true })
  user!: Ref<User>;
}
