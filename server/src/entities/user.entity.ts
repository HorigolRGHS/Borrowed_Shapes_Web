import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToOne,
  OneToMany,
  Collection,
  Opt,
} from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import { Role } from './enums';
import type { GameProfile } from './game-profile.entity';
import type { UserSession } from './user-session.entity';
import type { AuditLog } from './audit-log.entity';
import type { UserOnlineStatus } from './user-online-status.entity';
import type { ForumThread } from './forum-thread.entity';
import type { ForumComment } from './forum-comment.entity';
import type { ForumThreadVote } from './forum-thread-vote.entity';
import type { ForumCommentVote } from './forum-comment-vote.entity';
import type { WikiRevision } from './wiki-revision.entity';
import type { DownloadLog } from './download-log.entity';

const createId = init({ length: 24 });

@Entity({ schema: 'auth', tableName: 'User' })
export class User {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property({ unique: true })
  email!: string;

  @Property()
  passwordHash!: string;

  @Property({ unique: true, nullable: true })
  displayName?: string & Opt | null;

  @Enum(() => Role)
  role: Role & Opt = Role.USER;

  @Property()
  createdAt: Date & Opt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();

  @OneToOne('GameProfile', 'user', { nullable: true, lazy: true })
  gameProfile?: GameProfile & Opt;

  @OneToMany('UserSession', 'user')
  sessions = new Collection<UserSession>(this);

  @OneToMany('AuditLog', 'user')
  auditLogs = new Collection<AuditLog>(this);

  @OneToMany('ForumThread', 'author')
  forumThreads = new Collection<ForumThread>(this);

  @OneToMany('ForumComment', 'author')
  forumComments = new Collection<ForumComment>(this);

  @OneToMany('ForumThreadVote', 'user')
  threadVotes = new Collection<ForumThreadVote>(this);

  @OneToMany('ForumCommentVote', 'user')
  commentVotes = new Collection<ForumCommentVote>(this);

  @OneToMany('WikiRevision', 'author')
  wikiRevisions = new Collection<WikiRevision>(this);

  @OneToMany('DownloadLog', 'user')
  downloadLogs = new Collection<DownloadLog>(this);

  @OneToOne('UserOnlineStatus', 'user', { nullable: true, lazy: true })
  onlineStatus?: UserOnlineStatus & Opt;
}
