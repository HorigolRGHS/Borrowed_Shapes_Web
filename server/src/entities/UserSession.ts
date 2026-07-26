import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  type Opt,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { Auth$46SessionStatus } from './Auth$46SessionStatus';
import { User } from './User';

@Entity({ schema: 'auth' })
export class UserSession {
  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({
    name: 'UserSession_userId_idx',
    expression:
      'CREATE INDEX "UserSession_userId_idx" ON auth."UserSession" USING btree ("userId")',
  })
  @ManyToOne({ entity: () => User, fieldName: 'userId', deleteRule: 'cascade' })
  userId!: User;

  @Unique({
    name: 'UserSession_sessionId_key',
    expression:
      'CREATE UNIQUE INDEX "UserSession_sessionId_key" ON auth."UserSession" USING btree ("sessionId")',
  })
  @Property({ type: 'text' })
  sessionId!: string;

  @Property({ type: 'text', nullable: true })
  platform?: string;

  @Index({
    name: 'UserSession_loginTime_idx',
    expression:
      'CREATE INDEX "UserSession_loginTime_idx" ON auth."UserSession" USING btree ("loginTime")',
  })
  @Property({ type: 'datetime', defaultRaw: `now()` })
  loginTime!: Date & Opt;

  @Property({ nullable: true })
  logoutTime?: Date;

  @Property({ type: 'text', nullable: true })
  deviceInfo?: string;

  @Property({ columnType: 'inet' })
  ipAddress!: unknown;

  @Index({
    name: 'UserSession_status_idx',
    expression:
      'CREATE INDEX "UserSession_status_idx" ON auth."UserSession" USING btree (status) WHERE (status = \'ACTIVE\'::auth."SessionStatus")',
  })
  @Enum({
    items: () => Auth$46SessionStatus,
    nativeEnumName: 'auth.SessionStatus',
  })
  status: Auth$46SessionStatus & Opt = Auth$46SessionStatus.ACTIVE;
}
