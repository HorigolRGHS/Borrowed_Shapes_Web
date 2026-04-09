import { Entity, Index, ManyToOne, type Opt, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from './User';

@Entity({ schema: 'web' })
@Index({ name: 'RateLimitLog_ip_action_idx', expression: 'CREATE INDEX "RateLimitLog_ip_action_idx" ON web."RateLimitLog" USING btree ("ipAddress", "actionType", "createdAt" DESC)', properties: ['ipAddress', 'actionType', 'createdAt'] })
@Index({ name: 'RateLimitLog_user_action_idx', expression: 'CREATE INDEX "RateLimitLog_user_action_idx" ON web."RateLimitLog" USING btree ("userId", "actionType", "createdAt" DESC)', properties: ['userId', 'actionType', 'createdAt'] })
export class RateLimitLog {

  @PrimaryKey()
  id!: bigint;

  @ManyToOne({ entity: () => User, fieldName: 'userId', deleteRule: 'cascade', nullable: true })
  userId?: User;

  @Property({ columnType: 'inet', nullable: true })
  ipAddress?: unknown;

  @Property({ type: 'text' })
  actionType!: string;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

}
