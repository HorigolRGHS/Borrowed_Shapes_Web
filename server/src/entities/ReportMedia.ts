import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  type Opt,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Report } from './Report';
import { Web$46MediaType } from './Web$46MediaType';

@Entity({ schema: 'web' })
export class ReportMedia {
  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({
    name: 'ReportMedia_reportId_idx',
    expression:
      'CREATE INDEX "ReportMedia_reportId_idx" ON web."ReportMedia" USING btree ("reportId")',
  })
  @ManyToOne({
    entity: () => Report,
    fieldName: 'reportId',
    deleteRule: 'cascade',
  })
  reportId!: Report;

  @Property({ type: 'text' })
  mediaUrl!: string;

  @Enum({ items: () => Web$46MediaType, nativeEnumName: 'web.MediaType' })
  mediaType!: Web$46MediaType;

  @Property({ nullable: true })
  fileSize?: bigint;

  @Property({ nullable: true })
  duration?: number;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  uploadedAt!: Date & Opt;
}
