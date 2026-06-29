import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { ForumComment } from '../entities/ForumComment';
import { ForumCommentVote } from '../entities/ForumCommentVote';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([ForumComment, ForumCommentVote]),
    AuthModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
