import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { ForumComment } from '../entities/ForumComment';
import { ForumCommentVote } from '../entities/ForumCommentVote';
import { AuthModule } from '../auth/auth.module';
import { ForumModule } from '../forums/forums.module';
import { AuditModule } from '../audit/audit.module';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

import {
  ForumCommentRepository,
  ForumCommentVoteRepository,
} from './repositories/comments.repository';

@Module({
  imports: [
    MikroOrmModule.forFeature([ForumComment, ForumCommentVote]),
    AuthModule,
    AuditModule,
    ForumModule,
  ],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    RateLimitGuard,
    ForumCommentRepository,
    ForumCommentVoteRepository,
  ],
  exports: [
    CommentsService,
    ForumCommentRepository,
    ForumCommentVoteRepository,
  ],
})
export class CommentsModule {}

