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
import { AuditActionType } from './enums';
import type { User } from './user.entity';

const createId = init({ length: 24 });

@Index({ properties: ['user'] })
@Index({ properties: ['entityName'] })
@Index({ properties: ['entityId'] })
@Index({ properties: ['timestamp'] })
@Entity({ schema: 'auth', tableName: 'AuditLog' })
export class AuditLog {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property({ nullable: true, type: 'json' })
  oldValue?: unknown & Opt;

  @Property({ nullable: true, type: 'json' })
  newValue?: unknown & Opt;

  @Property()
  timestamp: Date & Opt = new Date();

  @Property({ nullable: true })
  ipAddress?: string & Opt | null;

  @Enum(() => AuditActionType)
  actionType!: AuditActionType;

  @Property()
  entityName!: string;

  @Property()
  entityId!: string;

  @ManyToOne('User', { ref: true, nullable: true })
  user?: Ref<User> & Opt | null;
}
