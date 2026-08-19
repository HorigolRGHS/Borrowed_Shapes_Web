import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ForumService } from './forums.service';
import { ForumController } from './forums.controller';
import { ForumThread } from '../entities/ForumThread';
import { ForumCategory } from '../entities/ForumCategory';
import { ForumThreadVote } from '../entities/ForumThreadVote';
import { ForumComment } from '../entities/ForumComment';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { CategoryModule } from '../categories/categories.module';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

import {
  ForumThreadRepository,
  ForumThreadVoteRepository,
} from './repositories/forums.repository';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      ForumThread,
      ForumCategory,
      ForumThreadVote,
      ForumComment,
    ]),
    AuthModule,
    StorageModule,
    AuditModule,
    CategoryModule,
  ],
  controllers: [ForumController],
  providers: [
    ForumService,
    RateLimitGuard,
    ForumThreadRepository,
    ForumThreadVoteRepository,
  ],
  exports: [ForumService, ForumThreadRepository, ForumThreadVoteRepository],
})
export class ForumModule {}

