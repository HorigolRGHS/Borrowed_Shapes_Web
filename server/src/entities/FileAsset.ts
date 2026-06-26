import { Entity, type Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ schema: 'web' })
export class FileAsset {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ type: 'text' })
  fileName!: string;

  @Unique({ name: 'FileAsset_fileVersion_key', expression: 'CREATE UNIQUE INDEX "FileAsset_fileVersion_key" ON web."FileAsset" USING btree ("fileVersion")' })
  @Property({ type: 'text' })
  fileVersion!: string;

  @Property({ type: 'text' })
  filePath!: string;

  @Property()
  fileSize!: bigint;

  @Property({ type: 'text' })
  mimeType!: string;

  @Property({ type: 'boolean', default: false })
  isActive: boolean = false;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  uploadedAt!: Date & Opt;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;

}
