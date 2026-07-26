import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  type Opt,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { ForumCategory } from './ForumCategory';
import { User } from './User';
import { Web$46ForumPostType } from './Web$46ForumPostType';
import { Web$46ForumThreadStatus } from './Web$46ForumThreadStatus';

@Entity({ schema: 'web' })
@Index({
  name: 'ForumThread_authorId_createdAt_idx',
  expression:
    'CREATE INDEX "ForumThread_authorId_createdAt_idx" ON web."ForumThread" USING btree ("authorId", "createdAt" DESC)',
  properties: ['authorId', 'createdAt'],
})
@Index({
  name: 'ForumThread_categoryId_createdAt_idx',
  expression:
    'CREATE INDEX "ForumThread_categoryId_createdAt_idx" ON web."ForumThread" USING btree ("categoryId", "createdAt" DESC)',
  properties: ['categoryId', 'createdAt'],
})
@Index({
  name: 'ForumThread_categoryId_score_idx',
  expression:
    'CREATE INDEX "ForumThread_categoryId_score_idx" ON web."ForumThread" USING btree ("categoryId", score DESC)',
  properties: ['categoryId', 'score'],
})
@Index({
  name: 'ForumThread_fts_idx',
  expression:
    'CREATE INDEX "ForumThread_fts_idx" ON web."ForumThread" USING gin (to_tsvector(\'simple\'::regconfig, ((title || \' \'::text) || content)))',
})
export class ForumThread {
  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', unique: 'ForumThread_slug_key' })
  slug!: string;

  @ManyToOne({
    entity: () => ForumCategory,
    fieldName: 'categoryId',
    updateRule: 'cascade',
    deleteRule: 'cascade',
  })
  categoryId!: ForumCategory;

  @ManyToOne({
    entity: () => User,
    fieldName: 'authorId',
    deleteRule: 'cascade',
  })
  authorId!: User;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'text', nullable: true })
  imageUrl?: string;

  @Enum({
    items: () => Web$46ForumPostType,
    nativeEnumName: 'web.ForumPostType',
  })
  postType: Web$46ForumPostType & Opt = Web$46ForumPostType.GENERAL;

  @Property({ type: 'integer' })
  viewCount: number & Opt = 0;

  @Property({ type: 'integer' })
  score: number & Opt = 0;

  @Property({ type: 'integer' })
  commentCount: number & Opt = 0;

  @Property({ type: 'boolean' })
  isPinned: boolean & Opt = false;

  @Enum({
    items: () => Web$46ForumThreadStatus,
    nativeEnumName: 'web.ForumThreadStatus',
  })
  status: Web$46ForumThreadStatus & Opt = Web$46ForumThreadStatus.OPEN;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;
}
