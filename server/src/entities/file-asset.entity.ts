import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { DownloadStats } from './download-stats.entity';

const createId = init({ length: 24 });

@Entity({ schema: 'web', tableName: 'FileAsset' })
export class FileAsset {
  @PrimaryKey()
  id: string = createId();

  @Property()
  fileName!: string;

  @Property({ unique: true })
  fileVersion!: string;

  @Property()
  filePath!: string;

  @Property({ type: 'bigint' })
  fileSize!: bigint;

  @Property()
  mimeType!: string;

  @Property()
  uploadedAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @OneToMany('DownloadStats', 'fileAsset')
  downloadStats = new Collection<DownloadStats>(this);
}
