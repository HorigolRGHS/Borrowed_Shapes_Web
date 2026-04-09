import { Entity, Enum, Index, ManyToOne, type Opt, PrimaryKey, Property } from '@mikro-orm/core';
import { Auth$46AuditActionType } from './Auth$46AuditActionType';
import { User } from './User';

@Entity({ schema: 'auth' })
export class AuditLog {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({ name: 'AuditLog_userId_idx', expression: 'CREATE INDEX "AuditLog_userId_idx" ON auth."AuditLog" USING btree ("userId")' })
  @ManyToOne({ entity: () => User, fieldName: 'userId', deleteRule: 'set null', nullable: true })
  userId?: User;

  @Enum({ items: () => Auth$46AuditActionType, nativeEnumName: 'auth.AuditActionType' })
  actionType!: Auth$46AuditActionType;

  @Index({ name: 'AuditLog_entityName_idx', expression: 'CREATE INDEX "AuditLog_entityName_idx" ON auth."AuditLog" USING btree ("entityName")' })
  @Property({ type: 'text' })
  entityName!: string;

  @Index({ name: 'AuditLog_entityId_idx', expression: 'CREATE INDEX "AuditLog_entityId_idx" ON auth."AuditLog" USING btree ("entityId")' })
  @Property({ type: 'text' })
  entityId!: string;

  @Property({ type: 'json', nullable: true })
  oldValue?: any;

  @Property({ type: 'json', nullable: true })
  newValue?: any;

  @Index({ name: 'AuditLog_timestamp_idx', expression: 'CREATE INDEX "AuditLog_timestamp_idx" ON auth."AuditLog" USING btree ("timestamp" DESC)' })
  @Property({ type: 'datetime', defaultRaw: `now()` })
  timestamp!: Date & Opt;

  @Property({ columnType: 'inet', nullable: true })
  ipAddress?: unknown;

}
