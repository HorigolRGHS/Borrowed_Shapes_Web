import { Entity, ManyToOne, Property, Index } from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import type { User } from './user.entity';
import type { ForumComment } from './forum-comment.entity';

@Index({ properties: ['comment'] })
@Entity({ schema: 'web', tableName: 'ForumCommentVote' })
export class ForumCommentVote {
  @ManyToOne('User', { ref: true, primary: true })
  user!: Ref<User>;

  @ManyToOne('ForumComment', { ref: true, primary: true })
  comment!: Ref<ForumComment>;

  @Property()
  value!: number;
}
