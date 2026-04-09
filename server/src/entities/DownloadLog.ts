import { Entity, Index, ManyToOne, type Opt, PrimaryKey, Property } from '@mikro-orm/core';
import { FileAsset } from './FileAsset';
import { User } from './User';

@Entity({ schema: 'web' })
export class DownloadLog {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({ name: 'DownloadLog_userId_idx', expression: 'CREATE INDEX "DownloadLog_userId_idx" ON web."DownloadLog" USING btree ("userId") WHERE ("userId" IS NOT NULL)' })
  @ManyToOne({ entity: () => User, fieldName: 'userId', deleteRule: 'set null', nullable: true })
  userId?: User;

  @Index({ name: 'DownloadLog_fileAssetId_idx', expression: 'CREATE INDEX "DownloadLog_fileAssetId_idx" ON web."DownloadLog" USING btree ("fileAssetId")' })
  @ManyToOne({ entity: () => FileAsset, fieldName: 'fileAssetId', deleteRule: 'cascade' })
  fileAssetId!: FileAsset;

  @Property()
  bytesSent!: bigint;

  @Property({ columnType: 'inet' })
  clientIp!: unknown;

  @Index({ name: 'DownloadLog_downloadedAt_idx', expression: 'CREATE INDEX "DownloadLog_downloadedAt_idx" ON web."DownloadLog" USING btree ("downloadedAt" DESC)' })
  @Property({ type: 'datetime', defaultRaw: `now()` })
  downloadedAt!: Date & Opt;

}
