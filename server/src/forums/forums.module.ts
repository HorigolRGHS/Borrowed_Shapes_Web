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

import { ForumThreadRepository } from './repositories/forums.repository';

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
  ],
  controllers: [ForumController],
  providers: [ForumService, ForumThreadRepository],
  exports: [ForumService, ForumThreadRepository],
})
export class ForumModule {}
