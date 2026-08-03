import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKeyProp,
} from '@mikro-orm/core';
import { ForumThread } from './ForumThread';
import { User } from './User';

@Entity({ schema: 'web' })
export class ForumThreadVote {
  [PrimaryKeyProp]?: ['userId', 'threadId'];

  @ManyToOne({
    entity: () => User,
    fieldName: 'userId',
    deleteRule: 'cascade',
    primary: true,
  })
  userId!: User;

  @Index({
    name: 'ForumThreadVote_threadId_idx',
    expression:
      'CREATE INDEX "ForumThreadVote_threadId_idx" ON web."ForumThreadVote" USING btree ("threadId")',
  })
  @ManyToOne({
    entity: () => ForumThread,
    fieldName: 'threadId',
    deleteRule: 'cascade',
    primary: true,
  })
  threadId!: ForumThread;

  @Enum({ items: () => ForumThreadVoteValue })
  value!: ForumThreadVoteValue;
}

export enum ForumThreadVoteValue {
  DOWN = '-1',
  UP = '1',
}
