import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Unique,
  Index,
  DateType,
  Opt,
} from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { FileAsset } from './file-asset.entity';

const createId = init({ length: 24 });

@Unique({ properties: ['fileAsset', 'date'] })
@Index({ properties: ['fileAsset'] })
@Entity({ schema: 'web', tableName: 'DownloadStats' })
export class DownloadStats {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property({ type: DateType })
  date!: Date;

  @Property({ type: 'bigint', default: 0 })
  downloadCount: bigint & Opt = 0n;

  @Property({ type: 'bigint', default: 0 })
  totalBytesSent: bigint & Opt = 0n;

  @ManyToOne('FileAsset', { ref: true })
  fileAsset!: Ref<FileAsset>;
}
