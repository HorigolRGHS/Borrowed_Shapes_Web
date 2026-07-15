import {
  Entity,
  Enum,
  Index,
  type Opt,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { Auth$46Role } from './Auth$46Role';

@Entity({ schema: 'auth' })
export class User {
  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ columnType: 'citext', unique: 'User_email_key' })
  email!: unknown;

  @Property({ type: 'text', nullable: true })
  passwordHash?: string;

  @Unique({
    name: 'User_googleId_key',
    expression:
      'CREATE UNIQUE INDEX "User_googleId_key" ON auth."User" USING btree ("googleId")',
  })
  @Property({ type: 'text', nullable: true })
  googleId?: string;

  @Property({ type: 'text', nullable: true })
  imgUrl?: string;

  @Property({ type: 'text' })
  displayName!: string;

  @Enum({ items: () => Auth$46Role, nativeEnumName: 'auth.Role' })
  role: Auth$46Role & Opt = Auth$46Role.USER;

  @Property({ type: 'boolean' })
  isBanned: boolean & Opt = false;

  @Property({ nullable: true })
  bannedAt?: Date;

  @Property({ type: 'text', nullable: true })
  banReason?: string;

  @Index({
    name: 'User_banExpiresAt_idx',
    expression:
      'CREATE INDEX "User_banExpiresAt_idx" ON auth."User" USING btree ("banExpiresAt") WHERE ("isBanned" = true)',
  })
  @Property({ nullable: true })
  banExpiresAt?: Date;

  @Index({
    name: 'User_deletedAt_idx',
    expression:
      'CREATE INDEX "User_deletedAt_idx" ON auth."User" USING btree ("deletedAt") WHERE ("deletedAt" IS NULL)',
  })
  @Property({ nullable: true })
  deletedAt?: Date;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;
}
