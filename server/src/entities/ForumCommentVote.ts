import { Entity, Enum, Index, ManyToOne, PrimaryKeyProp } from '@mikro-orm/core';
import { ForumComment } from './ForumComment';
import { User } from './User';

@Entity({ schema: 'web' })
export class ForumCommentVote {

  [PrimaryKeyProp]?: ['userId', 'commentId'];

  @ManyToOne({ entity: () => User, fieldName: 'userId', deleteRule: 'cascade', primary: true })
  userId!: User;

  @Index({ name: 'ForumCommentVote_commentId_idx', expression: 'CREATE INDEX "ForumCommentVote_commentId_idx" ON web."ForumCommentVote" USING btree ("commentId")' })
  @ManyToOne({ entity: () => ForumComment, fieldName: 'commentId', deleteRule: 'cascade', primary: true })
  commentId!: ForumComment;

  @Enum({ items: () => ForumCommentVoteValue })
  value!: ForumCommentVoteValue;

}

export enum ForumCommentVoteValue {
  DOWNVOTE = -1,
  UPVOTE = 1,
}
