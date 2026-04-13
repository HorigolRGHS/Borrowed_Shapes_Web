import { Entity, Enum, Index, ManyToOne, type Opt, PrimaryKey, Property, type Rel } from '@mikro-orm/core';
import { User } from './User';
import { Web$46AnnouncementType } from './Web$46AnnouncementType';

@Entity({ schema: 'web' })
@Index({ name: 'Announcement_authorId_idx', expression: 'CREATE INDEX "Announcement_authorId_idx" ON web."Announcement" USING btree ("authorId")', properties: ['authorId'] })
@Index({ name: 'Announcement_isPublished_publishedAt_idx', expression: 'CREATE INDEX "Announcement_isPublished_publishedAt_idx" ON web."Announcement" USING btree ("isPublished", "publishedAt" DESC)', properties: ['isPublished', 'publishedAt'] })
export class Announcement {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ type: 'text', unique: 'Announcement_slug_key' })
  slug!: string;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  summary?: string;

  @Property({ type: 'text' })
  content!: string;

  @ManyToOne({ entity: () => User, fieldName: 'authorId', deleteRule: 'cascade' })
  authorId!: Rel<User>;

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
