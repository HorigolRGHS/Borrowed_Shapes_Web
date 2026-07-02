import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ForumComment } from '../entities/ForumComment';
import { ForumCommentVote, ForumCommentVoteValue } from '../entities/ForumCommentVote';
import { ForumThread } from '../entities/ForumThread';
import { User } from '../entities/User';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { GameProfile } from 'src/entities/GameProfile';

@Injectable()
export class CommentsService {
  constructor(private readonly em: EntityManager) { }

  // Create a new comment
  async create(dto: CreateCommentDto, userId: string) {
    const thread = await this.em.findOne(ForumThread, { id: dto.threadId });
    if (!thread) throw new NotFoundException('Thread not found');

    let parent: ForumComment | null = null;
    if (dto.parentId) {
      parent = await this.em.findOne(ForumComment, { id: dto.parentId }, { populate: ['threadId'] });
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (String(parent.threadId.id) !== String(thread.id)) {
        throw new BadRequestException('Parent comment belongs to a different thread');
      }
    }

    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new BadRequestException('User not found');

    const comment = this.em.create(ForumComment, {
      threadId: thread,
      authorId: user,
      content: dto.content,
      parentId: parent || undefined,
    });

    await this.em.persistAndFlush(comment);

    // Retrieve populated equipped achievement badge
    const gp = await this.em.findOne(
      GameProfile,
      { userId },
      { populate: ['equippedAchievementId'] }
    );
    const badgeImageUrl = (gp as any)?.equippedAchievementId?.badgeImageUrl || null;

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

  // Find paginated comments for a thread, optionally filtered by parentId
  async findComments(threadId: string, parentId: string | null, page: number, limit: number, userId?: string) {
    const offset = (page - 1) * limit;
    const parentCheck = parentId ? `c."parentId" = ?` : `c."parentId" IS NULL`;
    const params: any[] = parentId ? [threadId, parentId, limit, offset] : [threadId, limit, offset];

    const query = `
      SELECT 
        c."id", c."content", c."parentId", c."score", c."isDeleted",
        c."createdAt", c."updatedAt",
        u."id" AS "authorId", u."displayName" AS "authorName",
        u."imgUrl" AS "authorImg",
        ach."badgeImageUrl",
        p."content" AS "parentContent",
        (SELECT COUNT(*)::int FROM web."ForumComment" r WHERE r."parentId" = c."id") AS "repliesCount"
        ${userId ? `, (SELECT v."value" FROM web."ForumCommentVote" v WHERE v."commentId" = c."id" AND v."userId" = ?) AS "userVote"` : ', NULL AS "userVote"'}
      FROM web."ForumComment" c
      LEFT JOIN auth."User" u ON u."id" = c."authorId"
      LEFT JOIN game."GameProfile" gp ON gp."userId" = u."id"
      LEFT JOIN game."Achievement" ach ON ach."id" = gp."equippedAchievementId"
      LEFT JOIN web."ForumComment" p ON p."id" = c."parentId"
      WHERE c."threadId" = ? AND ${parentCheck}
      ORDER BY c."createdAt" ASC
      LIMIT ? OFFSET ?
    `;

    const fullParams = userId ? [userId, ...params] : params;
    const rows = await this.em.execute(query, fullParams);

    return rows.map((row: any) => ({
      id: row.id,
      content: row.isDeleted ? "[Deleted]" : row.content,
      score: Number(row.score || 0),
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      parentId: row.parentId || null,
      parentContent: row.parentContent || null,
      author: row.isDeleted ? null : {
        id: row.authorId,
        displayName: row.authorName || "Deleted User",
        imgUrl: row.authorImg,
        badgeImageUrl: row.badgeImageUrl,
      },
      repliesCount: Number(row.repliesCount || 0),
      hasReplies: Number(row.repliesCount || 0) > 0,
      userVote: row.userVote ? Number(row.userVote) : null,
    }));
  }

  // Update comment content (author only)
  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.em.findOne(ForumComment, { id }, { populate: ['authorId'] });
    if (!comment) throw new NotFoundException('Comment not found');

    if (String(comment.authorId.id) !== String(userId)) {
      throw new ForbiddenException('You do not have permission to edit this comment');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted comment');
    }

    comment.content = dto.content;
    comment.updatedAt = new Date();
    await this.em.flush();

    return comment;
  }

  // Soft delete comment
  async remove(id: string, userId: string, isAdmin = false) {
    const comment = await this.em.findOne(ForumComment, { id }, { populate: ['authorId'] });
    if (!comment) throw new NotFoundException('Comment not found');

    if (!isAdmin && String(comment.authorId.id) !== String(userId)) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    comment.isDeleted = true;
    comment.content = ''; // Clear content
    await this.em.flush();
    return null;
  }

  // Vote comment
  async vote(commentId: string, userId: string, value: 1 | -1) {
    const comment = await this.em.findOne(ForumComment, { id: commentId });
    if (!comment) throw new NotFoundException('Comment not found');

    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new BadRequestException('Invalid user');

    const voteValue = value === 1 ? ForumCommentVoteValue.UP : ForumCommentVoteValue.DOWN;

    // Use raw SQL to reliably find existing vote
    const existingRows = await this.em.execute(
      `select "value" from web."ForumCommentVote" where "userId" = ? and "commentId" = ?`,
      [userId, commentId],
    );
    const existingVote = existingRows?.[0];
    const existingValue = existingVote ? Number(existingVote.value) : null;

    if (existingValue === null) {
      // Create new vote
      const vote = this.em.create(ForumCommentVote, {
        commentId: comment,
        userId: user,
        value: voteValue,
      });
      comment.score = (comment.score || 0) + value;
      await this.em.persistAndFlush([vote, comment]);
      return { result: 'voted', score: comment.score, userVote: value };
    }

    if (existingValue === value) {
      // Same vote: toggle off (remove)
      await this.em.execute(
        `delete from web."ForumCommentVote" where "userId" = ? and "commentId" = ?`,
        [userId, commentId],
      );
      comment.score = (comment.score || 0) - value;
      await this.em.persistAndFlush([comment]);
      return { result: 'unvoted', score: comment.score, userVote: null };
    } else {
      // Change vote
      await this.em.execute(
        `update web."ForumCommentVote" set "value" = ? where "userId" = ? and "commentId" = ?`,
        [voteValue, userId, commentId],
      );
      comment.score = (comment.score || 0) + (value - existingValue);
      await this.em.persistAndFlush([comment]);
      return { result: 'changed', score: comment.score, userVote: value };
    }
  }
}
