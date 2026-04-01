import { Entity, ManyToOne, Property, Index } from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import type { User } from './user.entity';
import type { ForumThread } from './forum-thread.entity';

@Index({ properties: ['thread'] })
@Entity({ schema: 'web', tableName: 'ForumThreadVote' })
export class ForumThreadVote {
  @ManyToOne('User', { ref: true, primary: true })
  user!: Ref<User>;

  @ManyToOne('ForumThread', { ref: true, primary: true })
  thread!: Ref<ForumThread>;

  @Property()
  value!: number;
}
