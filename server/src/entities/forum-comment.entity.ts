import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  Opt,
} from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { ForumThread } from './forum-thread.entity';
import type { User } from './user.entity';
import type { ForumCommentVote } from './forum-comment-vote.entity';

const createId = init({ length: 24 });

@Index({ properties: ['thread', 'createdAt'] })
@Index({ properties: ['parent'] })
@Entity({ schema: 'web', tableName: 'ForumComment' })
export class ForumComment {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property()
  content!: string;

  @Property({ default: 0 })
  score: number & Opt = 0;

  @Property({ default: false })
  isDeleted: boolean & Opt = false;

  @Property()
  createdAt: Date & Opt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();

  @ManyToOne('ForumThread', { ref: true })
  thread!: Ref<ForumThread>;

  @ManyToOne('User', { ref: true })
  author!: Ref<User>;

  @ManyToOne('ForumComment', { ref: true, nullable: true })
  parent?: Ref<ForumComment> & Opt | null;

  @OneToMany('ForumComment', 'parent')
  replies = new Collection<ForumComment>(this);

  @OneToMany('ForumCommentVote', 'comment')
  votes = new Collection<ForumCommentVote>(this);
}
