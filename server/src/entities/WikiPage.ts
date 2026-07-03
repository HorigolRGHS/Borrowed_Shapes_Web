import {
  Entity,
  Index,
  ManyToOne,
  type Opt,
  PrimaryKey,
  Property,
  type Rel,
} from '@mikro-orm/core';
import type { WikiRevision } from './WikiRevision';

@Entity({ schema: 'web' })
export class WikiPage {
  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ type: 'text', unique: 'WikiPage_slug_key' })
  slug!: string;

  @Property({
    fieldName: 'slug_vi',
    type: 'text',
    unique: 'WikiPage_slug_vi_key',
  })
  slugVi!: string;

  @Property({ type: 'text', index: 'WikiPage_title_idx' })
  title!: string;

  @Property({ fieldName: 'title_vi', type: 'text' })
  titleVi!: string;

  @Index({
    name: 'WikiPage_metadata_gin_idx',
    expression:
      'CREATE INDEX "WikiPage_metadata_gin_idx" ON web."WikiPage" USING gin ("metadataJson")',
  })
  @Property({ type: 'json', nullable: true })
  metadataJson?: any;

  @Index({
    name: 'WikiPage_isPublished_idx',
    expression:
      'CREATE INDEX "WikiPage_isPublished_idx" ON web."WikiPage" USING btree ("isPublished") WHERE ("isPublished" = true)',
  })
  @Property({ type: 'boolean' })
  isPublished: boolean & Opt = false;

  @ManyToOne({
    entity: 'WikiRevision',
    fieldName: 'latestRevisionId',
    deleteRule: 'set null',
    nullable: true,
  })
  latestRevisionId?: Rel<WikiRevision>;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;
}
