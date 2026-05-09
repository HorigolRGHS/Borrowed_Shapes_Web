import { Entity, Enum, Index, ManyToOne, type Opt, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from './User';
import { Web$46AnnouncementType } from './Web$46AnnouncementType';

@Entity({ schema: 'web' })
@Index({ name: 'Announcement_isPublished_publishedAt_idx', expression: 'CREATE INDEX "Announcement_isPublished_publishedAt_idx" ON web."Announcement" USING btree ("isPublished", "publishedAt" DESC)', properties: ['isPublished', 'publishedAt'] })
export class Announcement {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @ManyToOne({ entity: () => User, fieldName: 'authorId', deleteRule: 'set null' })
  authorId!: User;

  @Property({ type: 'text', unique: 'Announcement_slug_key' })
  slug!: string;

  @Property({ type: 'text', unique: 'Announcement_slug_vi_key' })
  slug_vi!: string;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  title_vi!: string;

  @Property({ type: 'text', nullable: true })
  summary?: string;

  @Property({ type: 'text', nullable: true })
  summary_vi?: string;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'text' })
  content_vi!: string;

  @Enum({ items: () => Web$46AnnouncementType, nativeEnumName: 'web.AnnouncementType', index: 'Announcement_type_idx' })
  type: Web$46AnnouncementType & Opt = Web$46AnnouncementType.NEWS;

  @Property({ type: 'boolean' })
  isPinned: boolean & Opt = false;

  @Property({ type: 'boolean' })
  isPublished: boolean & Opt = false;

  @Property({ nullable: true })
  publishedAt?: Date;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;

}
