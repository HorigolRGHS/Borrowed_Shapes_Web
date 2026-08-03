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
import { GameProfile } from '../entities/GameProfile';
import { getProxyAvatarUrl } from '../auth/auth-utils';
import { getProxyMediaUrl } from '../storage/media-utils';
import {
  ForumCommentRepository,
  ForumCommentVoteRepository,
} from './repositories/comments.repository';
import { ForumThreadRepository } from '../forums/repositories/forums.repository';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../entities/AuditActionType';
import { randomUUID } from 'crypto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentRepository: ForumCommentRepository,
    private readonly commentVoteRepository: ForumCommentVoteRepository,
    private readonly threadRepository: ForumThreadRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateCommentDto, userId: string) {
    const thread = await this.threadRepository.findOne({ id: dto.threadId });
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
      id: randomUUID(),
      threadId: thread,
      authorId: user,
      content: dto.content,
      parentId: parent || undefined,
    });

    await this.auditService.recordInCurrentUnitOfWork({
      userId: userId,
      actionType: AuditActionType.CREATE,
      entityName: 'ForumComment',
      entityId: comment.id,
      newValue: {
        content: comment.content,
        threadId: thread.id,
        parentId: parent?.id,
      },
    });

    await this.commentRepository.persistAndFlush(comment);

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
        imgUrl: getProxyAvatarUrl(user.imgUrl, user.id, user.updatedAt),
        badgeImageUrl: getProxyMediaUrl(badgeImageUrl),
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
    await this.auditService.recordInCurrentUnitOfWork({
      userId: userId,
      actionType: AuditActionType.UPDATE,
      entityName: 'ForumComment',
      entityId: comment.id,
      newValue: {
        content: comment.content,
      },
    });

    await this.commentRepository.flush();

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

    await this.auditService.recordInCurrentUnitOfWork({
      userId: userId,
      actionType: AuditActionType.DELETE,
      entityName: 'ForumComment',
      entityId: comment.id,
      oldValue: {
        isDeleted: false,
      },
      newValue: {
        isDeleted: true,
      },
    });

    await this.commentRepository.flush();
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

    const userVote = await this.commentVoteRepository.getUserVote(
      userId,
      commentId,
    );
    const existingValue = userVote;

    if (existingValue === null) {
      const vote = this.commentVoteRepository.create({
        commentId: comment,
        userId: user,
        value: voteValue,
      });
      comment.score = (comment.score || 0) + value;
      await this.commentRepository
        .getEntityManager()
        .persistAndFlush([vote, comment]);

      await this.auditService.recordInCurrentUnitOfWork({
        userId: userId,
        actionType: AuditActionType.UPDATE,
        entityName: 'ForumComment',
        entityId: commentId,
        newValue: { score: comment.score, userVote: value },
      });

      return { result: 'voted', score: comment.score, userVote: value };
    }

    if (existingValue === value) {
      await this.commentVoteRepository.removeUserVote(userId, commentId);
      comment.score = (comment.score || 0) - value;
      await this.commentRepository
        .getEntityManager()
        .persistAndFlush([comment]);

      await this.auditService.recordInCurrentUnitOfWork({
        userId: userId,
        actionType: AuditActionType.UPDATE,
        entityName: 'ForumComment',
        entityId: commentId,
        newValue: { score: comment.score, userVote: null },
      });

      return { result: 'unvoted', score: comment.score, userVote: null };
    } else {
      await this.commentVoteRepository.updateUserVote(
        userId,
        commentId,
        voteValue as any,
      );
      comment.score = (comment.score || 0) + (value - existingValue);
      await this.commentRepository
        .getEntityManager()
        .persistAndFlush([comment]);

      await this.auditService.recordInCurrentUnitOfWork({
        userId: userId,
        actionType: AuditActionType.UPDATE,
        entityName: 'ForumComment',
        entityId: commentId,
        newValue: { score: comment.score, userVote: value },
      });

      return { result: 'changed', score: comment.score, userVote: value };
    }
  }
}
