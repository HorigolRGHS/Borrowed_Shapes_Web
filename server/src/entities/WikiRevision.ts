import { Entity, Index, ManyToOne, type Opt, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from './User';
import type { WikiPage } from './WikiPage';

@Entity({ schema: 'web' })
@Index({ name: 'WikiRevision_pageId_createdAt_idx', expression: 'CREATE INDEX "WikiRevision_pageId_createdAt_idx" ON web."WikiRevision" USING btree ("pageId", "createdAt" DESC)', properties: ['pageId', 'createdAt'] })
export class WikiRevision {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @ManyToOne({ entity: 'WikiPage', fieldName: 'pageId', deleteRule: 'cascade' })
  pageId!: WikiPage;

  @Index({ name: 'WikiRevision_authorId_idx', expression: 'CREATE INDEX "WikiRevision_authorId_idx" ON web."WikiRevision" USING btree ("authorId")' })
  @ManyToOne({ entity: () => User, fieldName: 'authorId', deleteRule: 'set null' })
  authorId!: User;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'text' })
  content_vi!: string;

  @Property({ type: 'text', nullable: true })
  summary?: string;

  @Property({ type: 'text', nullable: true })
  summary_vi?: string;

  @Property({ type: 'text', nullable: true })
  title?: string;

  @Property({ type: 'text', nullable: true })
  title_vi?: string;

  @Property({ type: 'text', nullable: true })
  slug?: string;

  @Property({ type: 'text', nullable: true })
  slug_vi?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadataJson?: Record<string, unknown>;

  @Property({ type: 'boolean', nullable: true })
  isPublished?: boolean;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

}
