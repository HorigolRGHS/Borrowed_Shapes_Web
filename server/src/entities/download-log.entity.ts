import { Entity, PrimaryKey, Property, ManyToOne, Ref, Index } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { User } from './user.entity';

const createId = init({ length: 24 });

@Index({ properties: ['fileVersion'] })
@Index({ properties: ['downloadedAt'] })
@Entity({ schema: 'web', tableName: 'DownloadLog' })
export class DownloadLog {
  @PrimaryKey()
  id: string = createId();

  @Property()
  fileVersion!: string;

  @Property({ type: 'bigint' })
  bytesSent!: bigint;

  @Property()
  clientIp!: string;

  @Property()
  downloadedAt: Date = new Date();

  @ManyToOne('User', { ref: true, nullable: true })
  user?: Ref<User> | null;
}
