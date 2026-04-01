import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  Opt,
} from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import { ForumThreadStatus, ForumPostType, ForumFlair } from './enums';
import type { ForumCategory } from './forum-category.entity';
import type { User } from './user.entity';
import type { ForumComment } from './forum-comment.entity';
import type { ForumThreadVote } from './forum-thread-vote.entity';

const createId = init({ length: 24 });

@Index({ properties: ['category', 'createdAt'] })
@Index({ properties: ['category', 'score'] })
@Index({ properties: ['author', 'createdAt'] })
@Entity({ schema: 'web', tableName: 'ForumThread' })
export class ForumThread {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property()
  title!: string;

  @Property({ unique: true })
  slug!: string;

  @Property()
  content!: string;

  @Property({ nullable: true })
  imageUrl?: string & Opt | null;

  @Enum(() => ForumPostType)
  postType: ForumPostType & Opt = ForumPostType.TEXT;

  @Enum({ items: () => ForumFlair, nullable: true })
  flair?: ForumFlair & Opt | null;

  @Property({ default: 0 })
  viewCount: number & Opt = 0;

  @Property({ default: 0 })
  score: number & Opt = 0;

  @Property({ default: 0 })
  commentCount: number & Opt = 0;

  @Property({ default: false })
  isPinned: boolean & Opt = false;

  @Property({ default: false })
  isLocked: boolean & Opt = false;

  @Property({ default: false })
  isAnnouncement: boolean & Opt = false;

  @Enum(() => ForumThreadStatus)
  status: ForumThreadStatus & Opt = ForumThreadStatus.OPEN;

  @Property()
  createdAt: Date & Opt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();

  @ManyToOne('ForumCategory', { ref: true })
  category!: Ref<ForumCategory>;

  @ManyToOne('User', { ref: true })
  author!: Ref<User>;

  @OneToMany('ForumComment', 'thread')
  comments = new Collection<ForumComment>(this);

  @OneToMany('ForumThreadVote', 'thread')
  votes = new Collection<ForumThreadVote>(this);
}
