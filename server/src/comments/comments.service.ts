import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ForumComment } from '../entities/ForumComment';
import {
  ForumCommentVote,
  ForumCommentVoteValue,
} from '../entities/ForumCommentVote';
import { ForumThread } from '../entities/ForumThread';
import { User } from '../entities/User';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { GameProfile } from 'src/entities/GameProfile';
import { ForumCommentRepository } from './repositories/comments.repository';

@Injectable()
export class CommentsService {
  constructor(private readonly commentRepository: ForumCommentRepository) {}

  async create(dto: CreateCommentDto, userId: string) {
    const thread = await this.commentRepository
      .getEntityManager()
      .findOne(ForumThread, { id: dto.threadId });
    if (!thread) throw new NotFoundException('comments.thread_not_found');

    let parent: ForumComment | null = null;
    if (dto.parentId) {
      parent = await this.commentRepository.findOne(
        { id: dto.parentId },
        { populate: ['threadId'] },
      );
      if (!parent) throw new NotFoundException('comments.parent_not_found');
      if (String(parent.threadId.id) !== String(thread.id)) {
        throw new BadRequestException('comments.parent_thread_mismatch');
      }
    }

    const user = await this.commentRepository
      .getEntityManager()
      .findOne(User, { id: userId });
    if (!user) throw new BadRequestException('comments.user_not_found');

    const comment = this.commentRepository.create({
      threadId: thread,
      authorId: user,
      content: dto.content,
      parentId: parent || undefined,
    });

    await this.commentRepository.getEntityManager().persistAndFlush(comment);

    const gp = await this.commentRepository
      .getEntityManager()
      .findOne(
        GameProfile,
        { userId },
        { populate: ['equippedAchievementId'] },
      );
    const badgeImageUrl =
      (gp as any)?.equippedAchievementId?.badgeImageUrl || null;

    return {
      id: comment.id,
      content: comment.content,
      score: Number(comment.score || 0),
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      parentId: comment.parentId?.id || null,
      author: {
        id: user.id,
        displayName: user.displayName,
        imgUrl: user.imgUrl,
        badgeImageUrl,
      },
      repliesCount: 0,
      hasReplies: false,
      userVote: null,
    };
  }

  async findComments(
    threadId: string,
    parentId: string | null,
    page: number,
    limit: number,
    userId?: string,
  ) {
    return this.commentRepository.findCommentsForThread(
      threadId,
      parentId,
      page,
      limit,
      userId,
    );
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.commentRepository.findOne(
      { id },
      { populate: ['authorId'] },
    );
    if (!comment) throw new NotFoundException('comments.comment_not_found');

    if (String(comment.authorId.id) !== String(userId)) {
      throw new ForbiddenException('comments.forbidden_edit');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('comments.cannot_edit_deleted');
    }

    comment.content = dto.content;
    comment.updatedAt = new Date();
    await this.commentRepository.getEntityManager().flush();

    return comment;
  }

  async remove(id: string, userId: string, isAdmin = false) {
    const comment = await this.commentRepository.findOne(
      { id },
      { populate: ['authorId'] },
    );
    if (!comment) throw new NotFoundException('comments.comment_not_found');

    if (!isAdmin && String(comment.authorId.id) !== String(userId)) {
      throw new ForbiddenException('comments.forbidden_delete');
    }

    comment.isDeleted = true;
    comment.content = '';
    await this.commentRepository.getEntityManager().flush();
    return null;
  }

  async vote(commentId: string, userId: string, value: 1 | -1) {
    const comment = await this.commentRepository.findOne({ id: commentId });
    if (!comment) throw new NotFoundException('comments.comment_not_found');

    const user = await this.commentRepository
      .getEntityManager()
      .findOne(User, { id: userId });
    if (!user) throw new BadRequestException('comments.invalid_user');

    const voteValue =
      value === 1 ? ForumCommentVoteValue.UP : ForumCommentVoteValue.DOWN;

    const existingRows = await this.commentRepository
      .getEntityManager()
      .execute(
        `select "value" from web."ForumCommentVote" where "userId" = ? and "commentId" = ?`,
        [userId, commentId],
      );
    const existingVote = existingRows?.[0];
    const existingValue = existingVote ? Number(existingVote.value) : null;

    if (existingValue === null) {
      const vote = this.commentRepository
        .getEntityManager()
        .create(ForumCommentVote, {
          commentId: comment,
          userId: user,
          value: voteValue,
        });
      comment.score = (comment.score || 0) + value;
      await this.commentRepository
        .getEntityManager()
        .persistAndFlush([vote, comment]);
      return { result: 'voted', score: comment.score, userVote: value };
    }

    if (existingValue === value) {
      await this.commentRepository
        .getEntityManager()
        .execute(
          `delete from web."ForumCommentVote" where "userId" = ? and "commentId" = ?`,
          [userId, commentId],
        );
      comment.score = (comment.score || 0) - value;
      await this.commentRepository
        .getEntityManager()
        .persistAndFlush([comment]);
      return { result: 'unvoted', score: comment.score, userVote: null };
    } else {
      await this.commentRepository
        .getEntityManager()
        .execute(
          `update web."ForumCommentVote" set "value" = ? where "userId" = ? and "commentId" = ?`,
          [voteValue, userId, commentId],
        );
      comment.score = (comment.score || 0) + (value - existingValue);
      await this.commentRepository
        .getEntityManager()
        .persistAndFlush([comment]);
      return { result: 'changed', score: comment.score, userVote: value };
    }
  }
}
