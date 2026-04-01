import 'dotenv/config';
import { defineConfig } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { CamelCaseNamingStrategy } from './common/camel-case-naming-strategy';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Level } from './entities/level.entity';
import { GameProfile } from './entities/game-profile.entity';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { GameRun } from './entities/game-run.entity';
import { GameRunPlayer } from './entities/game-run-player.entity';
import { GameSession } from './entities/game-session.entity';
import { GameSessionPlayer } from './entities/game-session-player.entity';
import { UserOnlineStatus } from './entities/user-online-status.entity';
import { ForumCategory } from './entities/forum-category.entity';
import { ForumThread } from './entities/forum-thread.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { ForumThreadVote } from './entities/forum-thread-vote.entity';
import { ForumCommentVote } from './entities/forum-comment-vote.entity';
import { WikiPage } from './entities/wiki-page.entity';
import { WikiRevision } from './entities/wiki-revision.entity';
import { FileAsset } from './entities/file-asset.entity';
import { DownloadLog } from './entities/download-log.entity';
import { DownloadStats } from './entities/download-stats.entity';

export default defineConfig({
  driver: PostgreSqlDriver,
  clientUrl: process.env.DATABASE_URL,
  namingStrategy: CamelCaseNamingStrategy,
  entities: [
    User,
    UserSession,
    AuditLog,
    Level,
    GameProfile,
    Achievement,
    UserAchievement,
    GameRun,
    GameRunPlayer,
    GameSession,
    GameSessionPlayer,
    UserOnlineStatus,
    ForumCategory,
    ForumThread,
    ForumComment,
    ForumThreadVote,
    ForumCommentVote,
    WikiPage,
    WikiRevision,
    FileAsset,
    DownloadLog,
    DownloadStats,
  ],
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './migrations',
    pathTs: './migrations',
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30_000,
  },
});