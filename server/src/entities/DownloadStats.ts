import { Entity, Index, ManyToOne, type Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { FileAsset } from './FileAsset';

@Entity({ schema: 'web' })
@Unique({ name: 'DownloadStats_fileAssetId_date_key', expression: 'CREATE UNIQUE INDEX "DownloadStats_fileAssetId_date_key" ON web."DownloadStats" USING btree ("fileAssetId", date)', properties: ['fileAssetId', 'date'] })
export class DownloadStats {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({ name: 'DownloadStats_fileAssetId_idx', expression: 'CREATE INDEX "DownloadStats_fileAssetId_idx" ON web."DownloadStats" USING btree ("fileAssetId")' })
  @ManyToOne({ entity: () => FileAsset, fieldName: 'fileAssetId', deleteRule: 'cascade' })
  fileAssetId!: FileAsset;

  @Property({ type: 'date' })
  date!: string;

  @Property({ type: 'bigint', defaultRaw: `0` })
  downloadCount!: bigint & Opt;

  @Property({ type: 'bigint', defaultRaw: `0` })
  totalBytesSent!: bigint & Opt;

}
