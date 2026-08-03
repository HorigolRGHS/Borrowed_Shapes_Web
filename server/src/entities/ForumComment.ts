import {
  Entity,
  Index,
  ManyToOne,
  type Opt,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { ForumThread } from './ForumThread';
import { User } from './User';

@Entity({ schema: 'web' })
@Index({
  name: 'ForumComment_threadId_createdAt_idx',
  expression:
    'CREATE INDEX "ForumComment_threadId_createdAt_idx" ON web."ForumComment" USING btree ("threadId", "createdAt")',
  properties: ['threadId', 'createdAt'],
})
export class ForumComment {
  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @ManyToOne({
    entity: () => ForumThread,
    fieldName: 'threadId',
    deleteRule: 'cascade',
  })
  threadId!: ForumThread;

  @ManyToOne({
    entity: () => User,
    fieldName: 'authorId',
    deleteRule: 'cascade',
  })
  authorId!: User;

  @Property({ type: 'text' })
  content!: string;

  @Index({
    name: 'ForumComment_parentId_idx',
    expression:
      'CREATE INDEX "ForumComment_parentId_idx" ON web."ForumComment" USING btree ("parentId")',
  })
  @ManyToOne({
    entity: () => ForumComment,
    fieldName: 'parentId',
    deleteRule: 'cascade',
    nullable: true,
  })
  parentId?: ForumComment;

  @Property({ type: 'integer' })
  score: number & Opt = 0;

  @Property({ type: 'boolean' })
  isDeleted: boolean & Opt = false;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;
}
